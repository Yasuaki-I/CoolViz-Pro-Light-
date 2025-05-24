const { logger } = require('./logger');
const { sendNotification } = require('./notifications');

// ベースエラークラス
class AppError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// バリデーションエラー
class ValidationError extends AppError {
  constructor(message, context = {}) {
    super(message, 400, context);
    this.name = 'ValidationError';
  }
}

// 認証エラー
class AuthenticationError extends AppError {
  constructor(message, context = {}) {
    super(message, 401, context);
    this.name = 'AuthenticationError';
  }
}

// 認可エラー
class AuthorizationError extends AppError {
  constructor(message, context = {}) {
    super(message, 403, context);
    this.name = 'AuthorizationError';
  }
}

// リソース未検出エラー
class NotFoundError extends AppError {
  constructor(message, context = {}) {
    super(message, 404, context);
    this.name = 'NotFoundError';
  }
}

// レート制限エラー
class RateLimitError extends AppError {
  constructor(message, context = {}) {
    super(message, 429, context);
    this.name = 'RateLimitError';
  }
}

// 画像処理エラー
class ImageProcessingError extends AppError {
  constructor(message, context = {}) {
    super(message, 422, context);
    this.name = 'ImageProcessingError';
  }
}

// バナー生成エラー
class BannerGenerationError extends AppError {
  constructor(message, context = {}) {
    super(message, 422, context);
    this.name = 'BannerGenerationError';
  }
}

// キャッシュエラー
class CacheError extends AppError {
  constructor(message, context = {}) {
    super(message, 500, context);
    this.name = 'CacheError';
  }
}

// 外部APIエラー
class ExternalAPIError extends AppError {
  constructor(message, context = {}) {
    super(message, 502, context);
    this.name = 'ExternalAPIError';
  }
}

// エラーファクトリー
const createError = (type, message, context = {}) => {
  const errorTypes = {
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ImageProcessingError,
    BannerGenerationError,
    CacheError,
    ExternalAPIError,
  };

  const ErrorClass = errorTypes[type] || AppError;
  return new ErrorClass(message, context);
};

// エラーレスポンスの生成
const createErrorResponse = (error) => {
  const response = {
    error: {
      type: error.name,
      message: error.message,
      timestamp: error.timestamp,
    },
  };

  // 開発環境の場合はスタックトレースとコンテキストを含める
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
    response.error.context = error.context;
  }

  return response;
};

// エラーハンドリング関数
const handleError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // 開発環境では詳細なエラー情報を返す
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // 本番環境では簡潔なエラーメッセージのみを返す
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // プログラミングエラーや未知のエラーの場合
      logger.error('Unexpected error', { error: err });
      res.status(500).json({
        status: 'error',
        message: '予期せぬエラーが発生しました'
      });
    }
  }

  // 重大なエラーの場合は通知を送信
  if (err.statusCode >= 500) {
    sendNotification({
      type: 'error_alert',
      data: {
        message: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// 非同期エラーハンドリング
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// エラーログ記録
const logError = (err, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: req.headers
    },
    user: req.user ? {
      id: req.user.id,
      role: req.user.role
    } : null
  };

  logger.error('Error occurred', errorLog);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ImageProcessingError,
  BannerGenerationError,
  CacheError,
  ExternalAPIError,
  createError,
  createErrorResponse,
  handleError,
  asyncHandler,
  logError
}; 