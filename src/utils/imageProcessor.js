const sharp = require('sharp');
const { logger } = require('./logger');
const { get: getCache, set: setCache } = require('./cache');
const os = require('os');

// 画像処理の設定
const PROCESSOR_CONFIG = {
  // 並列処理の設定
  parallel: {
    maxConcurrent: Math.max(1, os.cpus().length - 1), // CPU数-1の並列処理
    queueSize: 100, // キューサイズ
  },

  // メモリ制限
  memory: {
    maxBufferSize: 50 * 1024 * 1024, // 50MB
    checkInterval: 1000, // 1秒ごとにチェック
  },

  // 画像処理の設定
  processing: {
    defaultQuality: 80,
    maxWidth: 2000,
    maxHeight: 2000,
    formats: ['jpeg', 'png', 'webp'],
  },

  // キャッシュ設定
  cache: {
    enabled: true,
    ttl: 3600, // 1時間
  }
};

// 処理キュー
const processingQueue = [];
let activeProcesses = 0;

// メモリ使用量の監視
const monitorMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();
  if (memoryUsage.heapUsed > PROCESSOR_CONFIG.memory.maxBufferSize) {
    logger.warn('High memory usage detected in image processing', {
      heapUsed: memoryUsage.heapUsed,
      limit: PROCESSOR_CONFIG.memory.maxBufferSize
    });
    return false;
  }
  return true;
};

// メモリ監視の開始
setInterval(monitorMemoryUsage, PROCESSOR_CONFIG.memory.checkInterval);

// 画像処理の実行
const processImage = async (imageBuffer, options) => {
  if (!monitorMemoryUsage()) {
    throw new Error('Memory limit exceeded');
  }

  try {
    const {
      width,
      height,
      format = 'jpeg',
      quality = PROCESSOR_CONFIG.processing.defaultQuality,
      fit = 'contain',
      background = { r: 255, g: 255, b: 255, alpha: 0 }
    } = options;

    // キャッシュキーの生成
    const cacheKey = {
      width,
      height,
      format,
      quality,
      fit,
      hash: require('crypto')
        .createHash('md5')
        .update(imageBuffer)
        .digest('hex')
    };

    // キャッシュから取得
    if (PROCESSOR_CONFIG.cache.enabled) {
      const cachedImage = await getCache('image', cacheKey);
      if (cachedImage) {
        logger.debug('Image retrieved from cache', { cacheKey });
        return cachedImage;
      }
    }

    // 画像処理の実行
    const processedImage = await sharp(imageBuffer)
      .resize(width, height, {
        fit,
        background
      })
      .toFormat(format, { quality })
      .toBuffer();

    // キャッシュに保存
    if (PROCESSOR_CONFIG.cache.enabled) {
      await setCache('image', cacheKey, processedImage);
    }

    return processedImage;
  } catch (error) {
    logger.error('Image processing error', { error, options });
    throw error;
  }
};

// キューに追加
const queueImageProcessing = (imageBuffer, options) => {
  return new Promise((resolve, reject) => {
    const task = {
      imageBuffer,
      options,
      resolve,
      reject
    };

    processingQueue.push(task);
    processNextInQueue();
  });
};

// キューの処理
const processNextInQueue = async () => {
  if (activeProcesses >= PROCESSOR_CONFIG.parallel.maxConcurrent || processingQueue.length === 0) {
    return;
  }

  const task = processingQueue.shift();
  activeProcesses++;

  try {
    const result = await processImage(task.imageBuffer, task.options);
    task.resolve(result);
  } catch (error) {
    task.reject(error);
  } finally {
    activeProcesses--;
    processNextInQueue();
  }
};

// バッチ処理
const processBatch = async (images, options) => {
  const results = await Promise.all(
    images.map(image => queueImageProcessing(image, options))
  );
  return results;
};

// 画像の最適化
const optimizeImage = async (imageBuffer, options = {}) => {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // サイズの最適化
    const optimizedOptions = {
      ...options,
      width: Math.min(metadata.width, PROCESSOR_CONFIG.processing.maxWidth),
      height: Math.min(metadata.height, PROCESSOR_CONFIG.processing.maxHeight),
      format: options.format || 'jpeg',
      quality: options.quality || PROCESSOR_CONFIG.processing.defaultQuality
    };

    return await queueImageProcessing(imageBuffer, optimizedOptions);
  } catch (error) {
    logger.error('Image optimization error', { error });
    throw error;
  }
};

// 画像の検証
const validateImage = async (imageBuffer) => {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // フォーマットの検証
    if (!PROCESSOR_CONFIG.processing.formats.includes(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }

    // サイズの検証
    if (metadata.width > PROCESSOR_CONFIG.processing.maxWidth ||
        metadata.height > PROCESSOR_CONFIG.processing.maxHeight) {
      throw new Error('Image dimensions exceed maximum allowed size');
    }

    return metadata;
  } catch (error) {
    logger.error('Image validation error', { error });
    throw error;
  }
};

// 画像処理の統計情報
const getStats = () => {
  return {
    queue: {
      length: processingQueue.length,
      active: activeProcesses,
      maxConcurrent: PROCESSOR_CONFIG.parallel.maxConcurrent
    },
    memory: process.memoryUsage(),
    config: PROCESSOR_CONFIG
  };
};

module.exports = {
  processImage,
  processBatch,
  optimizeImage,
  validateImage,
  getStats
}; 