const { logger } = require('./logger');
const { sendNotification } = require('./notifications');
const NodeCache = require('node-cache');
const mongoose = require('mongoose');

// キャッシュの設定
const cache = new NodeCache({
  stdTTL: 300, // 5分
  checkperiod: 60, // 1分ごとに期限切れチェック
  useClones: false
});

// パフォーマンスメトリクスの定義
const metrics = {
  requestCount: 0,
  requestDuration: [],
  dbQueryCount: 0,
  dbQueryDuration: [],
  cacheHits: 0,
  cacheMisses: 0,
  memoryUsage: [],
  cpuUsage: []
};

// パフォーマンスモニタリングの設定
const startMonitoring = () => {
  // メモリ使用量の監視
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss
    });

    // メモリ使用量が閾値を超えた場合のアラート
    if (memoryUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
      sendNotification({
        type: 'performance_alert',
        data: {
          message: 'メモリ使用量が閾値を超えています',
          usage: memoryUsage
        }
      });
    }
  }, 60000); // 1分ごと

  // データベース接続の監視
  mongoose.connection.on('connected', () => {
    logger.info('Database connection established');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('Database connection error', { error: err });
    sendNotification({
      type: 'database_alert',
      data: {
        message: 'データベース接続エラーが発生しました',
        error: err.message
      }
    });
  });
};

// リクエストのパフォーマンス計測
const measureRequestPerformance = (req, res, next) => {
  const start = process.hrtime();
  metrics.requestCount++;

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    metrics.requestDuration.push(duration);

    // レスポンス時間が閾値を超えた場合のアラート
    if (duration > 1000) { // 1秒
      logger.warn('Slow request detected', {
        path: req.path,
        method: req.method,
        duration
      });
    }
  });

  next();
};

// データベースクエリのパフォーマンス計測
const measureDbPerformance = async (operation) => {
  const start = process.hrtime();
  metrics.dbQueryCount++;

  try {
    const result = await operation();
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    metrics.dbQueryDuration.push(duration);

    // クエリ時間が閾値を超えた場合のアラート
    if (duration > 500) { // 500ms
      logger.warn('Slow database query detected', {
        duration,
        operation: operation.name
      });
    }

    return result;
  } catch (error) {
    logger.error('Database query failed', { error });
    throw error;
  }
};

// キャッシュの管理
const cacheManager = {
  get: async (key, fetchData, ttl = 300) => {
    const cachedData = cache.get(key);
    if (cachedData) {
      metrics.cacheHits++;
      return cachedData;
    }

    metrics.cacheMisses++;
    const data = await fetchData();
    cache.set(key, data, ttl);
    return data;
  },

  set: (key, data, ttl = 300) => {
    cache.set(key, data, ttl);
  },

  del: (key) => {
    cache.del(key);
  },

  clear: () => {
    cache.flushAll();
  }
};

// パフォーマンスレポートの生成
const generatePerformanceReport = () => {
  const report = {
    timestamp: new Date(),
    metrics: {
      requestCount: metrics.requestCount,
      averageRequestDuration: calculateAverage(metrics.requestDuration),
      dbQueryCount: metrics.dbQueryCount,
      averageDbQueryDuration: calculateAverage(metrics.dbQueryDuration),
      cacheHitRate: calculateCacheHitRate(),
      memoryUsage: getLatestMemoryUsage(),
      cpuUsage: getLatestCpuUsage()
    }
  };

  // レポートの保存と通知
  logger.info('Performance report generated', report);
  return report;
};

// ユーティリティ関数
const calculateAverage = (array) => {
  if (array.length === 0) return 0;
  return array.reduce((a, b) => a + b, 0) / array.length;
};

const calculateCacheHitRate = () => {
  const total = metrics.cacheHits + metrics.cacheMisses;
  return total === 0 ? 0 : (metrics.cacheHits / total) * 100;
};

const getLatestMemoryUsage = () => {
  return metrics.memoryUsage[metrics.memoryUsage.length - 1] || null;
};

const getLatestCpuUsage = () => {
  return metrics.cpuUsage[metrics.cpuUsage.length - 1] || null;
};

// メトリクスのリセット
const resetMetrics = () => {
  Object.keys(metrics).forEach(key => {
    if (Array.isArray(metrics[key])) {
      metrics[key] = [];
    } else {
      metrics[key] = 0;
    }
  });
};

module.exports = {
  startMonitoring,
  measureRequestPerformance,
  measureDbPerformance,
  cacheManager,
  generatePerformanceReport,
  resetMetrics
}; 