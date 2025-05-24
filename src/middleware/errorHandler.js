const { logger } = require('../utils/logger');
const { createErrorResponse } = require('../utils/errors');

// エラーハンドリングミドルウェア
const errorHandler = (err, req, res, next) => {
  // エラーのログ記録
  logger.error('Error occurred', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      context: err.context,
    },
    request: {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
      ip: req.ip,
    },
  });

  // エラーレスポンスの生成
  const errorResponse = createErrorResponse(err);

  // エラーの種類に応じたステータスコードの設定
  const statusCode = err.statusCode || 500;

  // エラーレスポンスの送信
  res.status(statusCode).json(errorResponse);

  // 重大なエラーの場合はプロセスを終了
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    logger.error('Critical error occurred, shutting down...', {
      error: err,
    });
    process.exit(1);
  }
};

// 404エラーハンドラー
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// 非同期エラーハンドラー
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// バリデーションエラーハンドラー
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        type: 'ValidationError',
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      },
    });
  }
  next(err);
};

// 認証エラーハンドラー
const authenticationErrorHandler = (err, req, res, next) => {
  if (err.name === 'AuthenticationError') {
    return res.status(401).json({
      error: {
        type: 'AuthenticationError',
        message: err.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
  next(err);
};

// レート制限エラーハンドラー
const rateLimitErrorHandler = (err, req, res, next) => {
  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      error: {
        type: 'RateLimitError',
        message: err.message,
        retryAfter: err.retryAfter,
        timestamp: new Date().toISOString(),
      },
    });
  }
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  authenticationErrorHandler,
  rateLimitErrorHandler,
}; 