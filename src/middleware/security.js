const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { logger } = require('../utils/logger');

// レート制限の設定
const rateLimitConfig = {
  // 通常のAPIリクエスト用
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // IPアドレスごとに100リクエスト
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // 画像処理用
  imageProcessing: rateLimit({
    windowMs: 60 * 60 * 1000, // 1時間
    max: 50, // IPアドレスごとに50リクエスト
    message: 'Image processing rate limit exceeded, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // バナー生成用
  bannerGeneration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1時間
    max: 30, // IPアドレスごとに30リクエスト
    message: 'Banner generation rate limit exceeded, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  })
};

// セキュリティヘッダーの設定
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
});

// 入力バリデーションの設定
const inputValidation = {
  // 画像処理のバリデーション
  imageProcessing: (req, res, next) => {
    try {
      const { width, height, format, quality } = req.body;

      // 数値の検証
      if (width && (isNaN(width) || width <= 0 || width > 2000)) {
        throw new Error('Invalid width parameter');
      }
      if (height && (isNaN(height) || height <= 0 || height > 2000)) {
        throw new Error('Invalid height parameter');
      }
      if (quality && (isNaN(quality) || quality < 0 || quality > 100)) {
        throw new Error('Invalid quality parameter');
      }

      // フォーマットの検証
      if (format && !['jpeg', 'png', 'webp'].includes(format)) {
        throw new Error('Invalid format parameter');
      }

      next();
    } catch (error) {
      logger.warn('Input validation failed', { error: error.message, body: req.body });
      res.status(400).json({ error: error.message });
    }
  },

  // バナー生成のバリデーション
  bannerGeneration: (req, res, next) => {
    try {
      const { template, text, images, colors } = req.body;

      // テンプレートの検証
      if (!template) {
        throw new Error('Template is required');
      }

      // テキストの検証
      if (text && typeof text !== 'string') {
        throw new Error('Invalid text parameter');
      }

      // 画像の検証
      if (images && !Array.isArray(images)) {
        throw new Error('Images must be an array');
      }

      // 色の検証
      if (colors && typeof colors !== 'object') {
        throw new Error('Invalid colors parameter');
      }

      next();
    } catch (error) {
      logger.warn('Input validation failed', { error: error.message, body: req.body });
      res.status(400).json({ error: error.message });
    }
  }
};

// エラーハンドリングミドルウェア
const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred', { error: err.message, stack: err.stack });

  // レート制限エラー
  if (err.type === 'RateLimitExceeded') {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: err.retryAfter
    });
  }

  // バリデーションエラー
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }

  // その他のエラー
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

module.exports = {
  rateLimit: rateLimitConfig,
  securityHeaders,
  inputValidation,
  errorHandler
}; 