const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// ログディレクトリの作成
const logDir = path.join(__dirname, '../../logs');
if (!require('fs').existsSync(logDir)) {
  require('fs').mkdirSync(logDir, { recursive: true });
}

// ログフォーマットの定義
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// ログレベルの定義
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// ロガーの設定
const logger = winston.createLogger({
  levels,
  format: logFormat,
  transports: [
    // エラーログ
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    // 全ログ
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// 開発環境の場合はコンソールにも出力
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// エラーハンドリング
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// カスタムエラーログ関数
const logError = (error, context = {}) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    ...context,
  };
  logger.error(errorLog);
};

// カスタムアクセスログ関数
const logAccess = (req, res, responseTime) => {
  const accessLog = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  };
  logger.http(accessLog);
};

module.exports = {
  logger,
  logError,
  logAccess,
}; 