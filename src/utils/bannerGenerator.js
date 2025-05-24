const sharp = require('sharp');
const { logger } = require('./logger');
const { get: getCache, set: setCache } = require('./cache');
const { processImage } = require('./imageProcessor');
const os = require('os');

// バナー生成の設定
const BANNER_CONFIG = {
  // 並列処理の設定
  parallel: {
    maxConcurrent: Math.max(1, os.cpus().length - 1),
    queueSize: 50,
  },

  // テンプレート設定
  templates: {
    defaultWidth: 1200,
    defaultHeight: 630,
    defaultFormat: 'jpeg',
    defaultQuality: 85,
  },

  // キャッシュ設定
  cache: {
    enabled: true,
    ttl: 1800, // 30分
  },

  // リソース制限
  resources: {
    maxMemoryPerBanner: 10 * 1024 * 1024, // 10MB
    maxProcessingTime: 30000, // 30秒
  }
};

// 処理キュー
const generationQueue = [];
let activeGenerations = 0;

// テンプレートのキャッシュ
const templateCache = new Map();

// テンプレートの読み込み
const loadTemplate = async (templatePath) => {
  try {
    // キャッシュから取得
    if (templateCache.has(templatePath)) {
      return templateCache.get(templatePath);
    }

    // テンプレートの読み込み
    const template = await sharp(templatePath).toBuffer();
    templateCache.set(templatePath, template);
    return template;
  } catch (error) {
    logger.error('Template loading error', { error, templatePath });
    throw error;
  }
};

// バナー生成の実行
const generateBanner = async (templatePath, options) => {
  try {
    const {
      width = BANNER_CONFIG.templates.defaultWidth,
      height = BANNER_CONFIG.templates.defaultHeight,
      format = BANNER_CONFIG.templates.defaultFormat,
      quality = BANNER_CONFIG.templates.defaultQuality,
      text,
      images = [],
      colors = {},
      timeout = BANNER_CONFIG.resources.maxProcessingTime
    } = options;

    // キャッシュキーの生成
    const cacheKey = {
      template: templatePath,
      width,
      height,
      format,
      quality,
      text,
      images: images.map(img => img.hash),
      colors,
      hash: require('crypto')
        .createHash('md5')
        .update(JSON.stringify({ templatePath, options }))
        .digest('hex')
    };

    // キャッシュから取得
    if (BANNER_CONFIG.cache.enabled) {
      const cachedBanner = await getCache('banner', cacheKey);
      if (cachedBanner) {
        logger.debug('Banner retrieved from cache', { cacheKey });
        return cachedBanner;
      }
    }

    // タイムアウトの設定
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Banner generation timeout')), timeout);
    });

    // バナー生成の実行
    const generationPromise = (async () => {
      // テンプレートの読み込み
      const template = await loadTemplate(templatePath);

      // 画像の処理
      const processedImages = await Promise.all(
        images.map(img => processImage(img.buffer, {
          width: img.width,
          height: img.height,
          format: img.format || 'jpeg',
          quality: img.quality || 80
        }))
      );

      // バナーの生成
      const banner = await sharp(template)
        .resize(width, height)
        .composite([
          ...processedImages.map((img, i) => ({
            input: img,
            top: images[i].top || 0,
            left: images[i].left || 0
          })),
          {
            input: {
              text: {
                text,
                font: 'Arial',
                fontSize: 48,
                ...colors
              }
            },
            top: 0,
            left: 0
          }
        ])
        .toFormat(format, { quality })
        .toBuffer();

      // キャッシュに保存
      if (BANNER_CONFIG.cache.enabled) {
        await setCache('banner', cacheKey, banner);
      }

      return banner;
    })();

    // タイムアウトと生成の競合
    const banner = await Promise.race([generationPromise, timeoutPromise]);
    return banner;
  } catch (error) {
    logger.error('Banner generation error', { error, options });
    throw error;
  }
};

// キューに追加
const queueBannerGeneration = (templatePath, options) => {
  return new Promise((resolve, reject) => {
    const task = {
      templatePath,
      options,
      resolve,
      reject
    };

    generationQueue.push(task);
    processNextInQueue();
  });
};

// キューの処理
const processNextInQueue = async () => {
  if (activeGenerations >= BANNER_CONFIG.parallel.maxConcurrent || generationQueue.length === 0) {
    return;
  }

  const task = generationQueue.shift();
  activeGenerations++;

  try {
    const result = await generateBanner(task.templatePath, task.options);
    task.resolve(result);
  } catch (error) {
    task.reject(error);
  } finally {
    activeGenerations--;
    processNextInQueue();
  }
};

// バッチ生成
const generateBatch = async (templates, options) => {
  const results = await Promise.all(
    templates.map(template => queueBannerGeneration(template.path, {
      ...options,
      ...template.options
    }))
  );
  return results;
};

// テンプレートの検証
const validateTemplate = async (templatePath) => {
  try {
    const template = await sharp(templatePath);
    const metadata = await template.metadata();

    // サイズの検証
    if (metadata.width > BANNER_CONFIG.templates.defaultWidth * 2 ||
        metadata.height > BANNER_CONFIG.templates.defaultHeight * 2) {
      throw new Error('Template dimensions exceed maximum allowed size');
    }

    // フォーマットの検証
    if (!['jpeg', 'png'].includes(metadata.format)) {
      throw new Error(`Unsupported template format: ${metadata.format}`);
    }

    return metadata;
  } catch (error) {
    logger.error('Template validation error', { error, templatePath });
    throw error;
  }
};

// バナー生成の統計情報
const getStats = () => {
  return {
    queue: {
      length: generationQueue.length,
      active: activeGenerations,
      maxConcurrent: BANNER_CONFIG.parallel.maxConcurrent
    },
    templates: {
      cached: templateCache.size
    },
    config: BANNER_CONFIG
  };
};

module.exports = {
  generateBanner,
  generateBatch,
  validateTemplate,
  getStats
}; 