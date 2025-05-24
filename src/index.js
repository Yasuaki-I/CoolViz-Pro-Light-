require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { Configuration, OpenAIApi } = require('openai');
const Replicate = require('replicate');
const NodeCache = require('node-cache');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { logger, logError, logAccess } = require('./utils/logger');
const {
  metricsMiddleware,
  performanceMonitoringMiddleware,
  startMetricsCollection,
  bannerGenerationDuration,
  imageProcessingDuration,
  imageProcessingSize,
  imageProcessingErrors,
  bannerGenerationErrors,
} = require('./utils/monitoring');
const {
  get: getCache,
  set: setCache,
  del: delCache,
  clear: clearCache,
  healthCheck: cacheHealthCheck,
} = require('./utils/cache');
const {
  ValidationError,
  ImageProcessingError,
  BannerGenerationError,
  ExternalAPIError,
} = require('./utils/errors');
const {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  authenticationErrorHandler,
  rateLimitErrorHandler,
} = require('./middleware/errorHandler');
const {
  checkHttpRequestDuration,
  checkImageProcessingDuration,
  checkBannerGenerationDuration,
  startAlertChecks,
} = require('./utils/alerts');
const { startReportGeneration } = require('./utils/reports');
const {
  securityHeaders,
  inputValidation,
} = require('./middleware/security');
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const { connectDB } = require('./config/database');
const { startSessionCleanup } = require('./utils/session');
const auditRoutes = require('./routes/audit');
const { startSecurityMonitoring } = require('./utils/audit');
const backupRoutes = require('./routes/backup');
const { startScheduledBackups } = require('./utils/backup');
const performanceRoutes = require('./routes/performance');
const {
  startMonitoring,
  measureRequestPerformance
} = require('./utils/performance');

// LINEの設定を読み込み
const lineConfig = require('../config/line');
const messageHandler = require('./handlers/messageHandler');
const fileHandler = require('./handlers/fileHandler');

// Expressアプリの初期化
const app = express();
const PORT = process.env.PORT || 3001;

// セキュリティミドルウェアの設定
app.use(helmet());
app.use(compression());

// レート制限の設定
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // IPアドレスごとのリクエスト数
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// ミドルウェアの設定
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// パフォーマンスモニタリングの設定
app.use(performanceMonitoringMiddleware);

// メトリクスエンドポイントの設定
app.get('/metrics', metricsMiddleware);

// ファイルアップロード用の設定
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// LINEミドルウェアの設定
app.use('/webhook', line.middleware(lineConfig));

// Webhookルートの設定
app.post('/webhook', (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// ヘルスチェック用エンドポイント
app.get('/', (req, res) => {
  res.send('Myブランディングちゃん【光杏】 - LINE Bot Server is running!');
});

// バナーサイズの定義
const BANNER_SIZES = {
  '728x90': { width: 728, height: 90, name: 'レクタングル' },
  '300x250': { width: 300, height: 250, name: 'ミディアムレクタングル' },
  '300x600': { width: 300, height: 600, name: 'ハーフページ' },
  '160x600': { width: 160, height: 600, name: 'ワイドスカイスクレイパー' },
  '320x50': { width: 320, height: 50, name: 'モバイルバナー' },
  '970x250': { width: 970, height: 250, name: 'ビルボード' }
};

// テンプレートの定義
const TEMPLATES = [
  {
    id: 1,
    name: 'シンプル',
    description: 'シンプルで見やすいデザイン',
    defaultSettings: {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      buttonColor: '#ff0000',
      fontFamily: 'Arial'
    }
  },
  {
    id: 2,
    name: 'モダン',
    description: '現代的でスタイリッシュなデザイン',
    defaultSettings: {
      backgroundColor: '#f5f5f5',
      textColor: '#333333',
      buttonColor: '#007bff',
      fontFamily: 'Helvetica'
    }
  },
  {
    id: 3,
    name: 'エレガント',
    description: '上品で洗練されたデザイン',
    defaultSettings: {
      backgroundColor: '#2c3e50',
      textColor: '#ffffff',
      buttonColor: '#e74c3c',
      fontFamily: 'Georgia'
    }
  },
  {
    id: 4,
    name: 'ポップ',
    description: '明るく活気のあるデザイン',
    defaultSettings: {
      backgroundColor: '#ffeb3b',
      textColor: '#000000',
      buttonColor: '#ff4081',
      fontFamily: 'Comic Sans MS'
    }
  },
  {
    id: 5,
    name: 'ミニマル',
    description: '最小限の要素で構成されたデザイン',
    defaultSettings: {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      buttonColor: '#000000',
      fontFamily: 'Roboto'
    }
  },
  {
    id: 6,
    name: 'プレミアム',
    description: '高級感のあるデザイン',
    defaultSettings: {
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      buttonColor: '#ffd700',
      fontFamily: 'Times New Roman'
    }
  }
];

// APIルート
app.get('/api/banner-sizes', (req, res) => {
  res.json(BANNER_SIZES);
});

app.get('/api/templates', (req, res) => {
  res.json(TEMPLATES);
});

// エラーハンドリングミドルウェアの登録
app.use(validationErrorHandler);
app.use(authenticationErrorHandler);
app.use(rateLimitErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// キャッシュの設定
const cache = new NodeCache({ stdTTL: 300 }); // 5分間のキャッシュ
global.cache = cache;

// メトリクス収集の開始
startMetricsCollection();
startAlertChecks();

// パフォーマンスレポート生成の開始
startReportGeneration();

// 画像処理の最適化
const optimizeImage = async (imagePath, options) => {
  const { width, height, quality = 80 } = options;
  
  return sharp(imagePath)
    .resize(width, height, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .jpeg({ quality })
    .toBuffer();
};

// キャッシュの健全性チェックエンドポイント
app.get('/api/cache/health', (req, res) => {
  const health = cacheHealthCheck();
  res.json(health);
});

// 画像アップロード
app.post('/api/upload', upload.single('image'), asyncHandler(async (req, res) => {
  const startTime = process.hrtime();
  try {
    if (!req.file) {
      throw new ValidationError('ファイルがアップロードされていません');
    }

    const { size } = req.body;
    const bannerSize = BANNER_SIZES[size];
    
    if (!bannerSize) {
      throw new ValidationError('無効なバナーサイズです', { size });
    }

    // キャッシュから画像を取得
    const cacheParams = {
      filename: req.file.filename,
      size: size,
    };
    let optimizedImage = await getCache('image', cacheParams);

    if (!optimizedImage) {
      try {
        // 画像の最適化
        optimizedImage = await optimizeImage(req.file.path, {
          width: bannerSize.width,
          height: bannerSize.height
        });
        
        // キャッシュに保存
        await setCache('image', cacheParams, optimizedImage);

        // 画像処理メトリクスの記録
        imageProcessingSize
          .labels('resize', 'jpeg')
          .observe(optimizedImage.length);
      } catch (error) {
        imageProcessingErrors
          .labels('resize', error.name)
          .inc();
        throw new ImageProcessingError('画像の最適化に失敗しました', {
          originalError: error.message,
          file: req.file.filename,
          size: bannerSize,
        });
      }
    }

    // 最適化された画像を保存
    const resizedImagePath = `uploads/resized_${req.file.filename}`;
    await sharp(optimizedImage).toFile(resizedImagePath);

    // 処理時間の計測
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    imageProcessingDuration
      .labels('resize', 'jpeg', `${bannerSize.width}x${bannerSize.height}`)
      .observe(duration);

    // 画像処理時間のアラートチェック
    checkImageProcessingDuration(
      'resize',
      'jpeg',
      `${bannerSize.width}x${bannerSize.height}`,
      duration
    );

    res.json({
      originalImage: `/uploads/${req.file.filename}`,
      resizedImage: `/uploads/resized_${req.file.filename}`,
      size: bannerSize
    });
  } catch (error) {
    next(error);
  }
}));

// 画像生成の設定
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 許可された画像タイプの定義
const ALLOWED_IMAGE_TYPES = [
  'background',
  'pattern',
  'texture',
  'gradient',
  'abstract'
];

// 画像生成エンドポイント
app.post('/api/generate-image', asyncHandler(async (req, res) => {
  try {
    const { prompt, size, type } = req.body;
    
    if (!prompt || !size || !type) {
      throw new ValidationError('必要なパラメータが不足しています', {
        provided: { prompt, size, type },
      });
    }

    // 画像タイプの検証
    if (!ALLOWED_IMAGE_TYPES.includes(type)) {
      throw new ValidationError('許可されていない画像タイプです', {
        type,
        allowedTypes: ALLOWED_IMAGE_TYPES,
      });
    }

    // サイズの検証
    const [width, height] = size.split('x').map(Number);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      throw new ValidationError('無効なサイズ指定です', { size });
    }

    // キャッシュから画像を取得
    const cacheParams = {
      prompt,
      size,
      type,
    };
    let generatedImage = await getCache('generated_image', cacheParams);

    if (!generatedImage) {
      try {
        // プロンプトの検証と修正
        const sanitizedPrompt = `professional ${type} design, elegant, high quality, suitable for advertising, ${prompt}`;
        
        // Stable Diffusionを使用して画像を生成
        const output = await replicate.run(
          "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
          {
            input: {
              prompt: sanitizedPrompt,
              width: width,
              height: height,
              num_outputs: 1,
              scheduler: "K_EULER",
              num_inference_steps: 50,
              guidance_scale: 7.5,
              seed: Math.floor(Math.random() * 1000000)
            }
          }
        );

        if (!output || !output[0]) {
          throw new ExternalAPIError('画像の生成に失敗しました', {
            prompt: sanitizedPrompt,
            size: { width, height },
          });
        }

        generatedImage = output[0];
        
        // キャッシュに保存
        await setCache('generated_image', cacheParams, generatedImage);
      } catch (error) {
        if (error instanceof ExternalAPIError) {
          throw error;
        }
        throw new ExternalAPIError('画像生成サービスでエラーが発生しました', {
          originalError: error.message,
          prompt,
          size,
          type,
        });
      }
    }

    res.json({
      success: true,
      imageUrl: generatedImage
    });
  } catch (error) {
    next(error);
  }
}));

// バナー生成エンドポイント
app.post('/api/generate-banner', asyncHandler(async (req, res) => {
  const startTime = process.hrtime();
  try {
    const { templateId, size, image, text, settings } = req.body;
    
    if (!templateId || !size) {
      throw new ValidationError('必要なパラメータが不足しています', {
        provided: { templateId, size },
      });
    }

    // サイズの検証
    const [width, height] = size.split('x').map(Number);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      throw new ValidationError('無効なサイズ指定です', { size });
    }

    // キャッシュからバナーを取得
    const cacheParams = {
      templateId,
      size,
      text: JSON.stringify(text),
      settings: JSON.stringify(settings),
    };
    let bannerBuffer = await getCache('banner', cacheParams);

    if (!bannerBuffer) {
      try {
        // 画像が提供されていない場合は生成
        let bannerImage = image;
        if (!bannerImage) {
          const imageResponse = await replicate.run(
            "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
            {
              input: {
                prompt: "professional banner background, elegant, high quality, suitable for adult entertainment industry",
                width: width,
                height: height,
                num_outputs: 1,
                scheduler: "K_EULER",
                num_inference_steps: 50,
                guidance_scale: 7.5,
                seed: Math.floor(Math.random() * 1000000)
              }
            }
          );
          
          if (!imageResponse || !imageResponse[0]) {
            bannerGenerationErrors
              .labels(templateId, 'image_generation_failed')
              .inc();
            throw new ExternalAPIError('背景画像の生成に失敗しました', {
              size: { width, height },
            });
          }
          
          bannerImage = imageResponse[0];
        }

        // バナーの生成
        bannerBuffer = await sharp({
          create: {
            width: width,
            height: height,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          }
        })
        .composite([
          {
            input: bannerImage,
            gravity: 'center'
          },
          {
            input: {
              text: {
                text: text.catchCopy,
                font: settings.fontFamily,
                fontSize: settings.fontSize,
                rgba: true
              }
            },
            gravity: 'center',
            top: -50
          },
          {
            input: {
              text: {
                text: text.bodyCopy,
                font: settings.fontFamily,
                fontSize: settings.fontSize * 0.8,
                rgba: true
              }
            },
            gravity: 'center',
            top: 50
          }
        ])
        .toBuffer();

        // キャッシュに保存
        await setCache('banner', cacheParams, bannerBuffer);

        // バナー生成メトリクスの記録
        imageProcessingSize
          .labels('banner', 'png')
          .observe(bannerBuffer.length);
      } catch (error) {
        bannerGenerationErrors
          .labels(templateId, error.name)
          .inc();
        if (error instanceof ExternalAPIError) {
          throw error;
        }
        throw new BannerGenerationError('バナーの生成に失敗しました', {
          originalError: error.message,
          templateId,
          size,
          text,
          settings,
        });
      }
    }

    // 生成されたバナーを保存
    const bannerPath = `uploads/banner_${Date.now()}.png`;
    await sharp(bannerBuffer).toFile(bannerPath);

    // 処理時間の計測
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;
    bannerGenerationDuration
      .labels(templateId, size)
      .observe(duration);

    // バナー生成時間のアラートチェック
    checkBannerGenerationDuration(templateId, size, duration);

    res.json({
      success: true,
      bannerUrl: `/${bannerPath}`
    });
  } catch (error) {
    next(error);
  }
}));

// バックアップルートの設定
app.use('/api/backup', backupRoutes);

// 定期的なバックアップの開始
startScheduledBackups();

// 認証ルートの設定
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

// 監査ログルートの設定
app.use('/api/audit', auditRoutes);

// セキュリティ監視の開始
startSecurityMonitoring();

// パフォーマンスモニタリングの開始
startMonitoring();

// パフォーマンス計測ミドルウェアの追加
app.use(measureRequestPerformance);

// パフォーマンスルートの設定
app.use('/api/performance', performanceRoutes);

// 保護されたルートの例
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// 権限付きルートの例
app.post('/api/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({ message: 'This is an admin route', user: req.user });
});

// イベントハンドラー
async function handleEvent(event) {
  const client = new line.Client(lineConfig);

  console.log('Event type:', event.type);
  if (event.type !== 'message') {
    console.log('Non-message event:', event);
  } else {
    console.log('Message type:', event.message.type);
  }

  // メッセージイベントの処理
  if (event.type === 'message') {
    // テキストメッセージの処理
    if (event.message.type === 'text') {
      return messageHandler.handleTextMessage(event, client);
    } 
    // 画像メッセージの処理
    else if (event.message.type === 'image') {
      return fileHandler.handleImageMessage(event, client);
    }
    // その他のファイルの処理
    else if (event.message.type === 'file') {
      return fileHandler.handleFileMessage(event, client);
    }
    // 未対応のメッセージタイプ
    else {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `すみません、${event.message.type}タイプのメッセージは現在対応していません。テキスト、画像、ファイルを送信してください。`
      });
    }
  }

  // フォローイベントの処理
  if (event.type === 'follow') {
    return client.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: 'はじめまして！AIパーソナル診断ツール「Myブランディングちゃん【光杏】」です♪'
      },
      {
        type: 'text',
        text: '私があなたのブランディングをサポートします！\n\n【できること】\n・キャッチコピーの提案\n・自己PR文の作成\n・SNS投稿アドバイス\n・写メ日記文体分析\n・画像生成プロンプト提供\n\n「診断開始」と送信してください✨'
      }
    ]);
  }

  // 友達解除イベントの処理（特に何もしない）
  if (event.type === 'unfollow') {
    console.log(`Unfollowed by user: ${event.source.userId}`);
    return Promise.resolve(null);
  }

  // その他のイベントは何もしない
  return Promise.resolve(null);
}

// サーバーの起動
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// データベース接続
connectDB().catch(err => {
  logger.error('Database connection failed', { error: err });
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  app.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully');
  app.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// セッションクリーンアップの開始
startSessionCleanup(); 