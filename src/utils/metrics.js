const promClient = require('prom-client');
const { logger } = require('./logger');
const os = require('os');

// メトリクスレジストリの作成
const register = new promClient.Registry();

// デフォルトメトリクスの追加
promClient.collectDefaultMetrics({ register });

// HTTPリクエスト関連のメトリクス
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestSize = new promClient.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 5000, 10000, 50000],
});

const httpResponseSize = new promClient.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 5000, 10000, 50000],
});

// 画像処理関連のメトリクス
const imageProcessingDuration = new promClient.Histogram({
  name: 'image_processing_duration_seconds',
  help: 'Duration of image processing operations in seconds',
  labelNames: ['operation', 'format', 'size'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const imageProcessingSize = new promClient.Histogram({
  name: 'image_processing_size_bytes',
  help: 'Size of processed images in bytes',
  labelNames: ['operation', 'format'],
  buckets: [1000, 10000, 100000, 1000000],
});

const imageProcessingErrors = new promClient.Counter({
  name: 'image_processing_errors_total',
  help: 'Total number of image processing errors',
  labelNames: ['operation', 'error_type'],
});

// バナー生成関連のメトリクス
const bannerGenerationDuration = new promClient.Histogram({
  name: 'banner_generation_duration_seconds',
  help: 'Duration of banner generation in seconds',
  labelNames: ['template_id', 'size'],
  buckets: [1, 2, 5, 10, 30],
});

const bannerGenerationErrors = new promClient.Counter({
  name: 'banner_generation_errors_total',
  help: 'Total number of banner generation errors',
  labelNames: ['template_id', 'error_type'],
});

// キャッシュ関連のメトリクス
const cacheHitRatio = new promClient.Gauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio',
});

const cacheSize = new promClient.Gauge({
  name: 'cache_size_bytes',
  help: 'Total size of cached data in bytes',
});

const cacheKeys = new promClient.Gauge({
  name: 'cache_keys_total',
  help: 'Total number of keys in cache',
});

// システムリソース関連のメトリクス
const memoryUsage = new promClient.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
});

const cpuUsage = new promClient.Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage',
});

// メトリクスをレジストリに登録
[
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestSize,
  httpResponseSize,
  imageProcessingDuration,
  imageProcessingSize,
  imageProcessingErrors,
  bannerGenerationDuration,
  bannerGenerationErrors,
  cacheHitRatio,
  cacheSize,
  cacheKeys,
  memoryUsage,
  cpuUsage,
].forEach(metric => register.registerMetric(metric));

// CPU使用率の計算
let lastCpuUsage = os.cpus().map(cpu => ({
  idle: cpu.times.idle,
  total: Object.values(cpu.times).reduce((a, b) => a + b, 0)
}));

// メトリクス収集の開始
const startMetricsCollection = () => {
  try {
    // 定期的なメトリクス更新
    setInterval(() => {
      // メモリ使用量の更新
      const memUsage = process.memoryUsage();
      Object.entries(memUsage).forEach(([type, value]) => {
        memoryUsage.labels(type).set(value);
      });

      // CPU使用率の更新
      const currentCpuUsage = os.cpus().map(cpu => ({
        idle: cpu.times.idle,
        total: Object.values(cpu.times).reduce((a, b) => a + b, 0)
      }));

      const cpuUsagePercent = currentCpuUsage.reduce((acc, cpu, i) => {
        const idleDiff = cpu.idle - lastCpuUsage[i].idle;
        const totalDiff = cpu.total - lastCpuUsage[i].total;
        return acc + (1 - idleDiff / totalDiff);
      }, 0) / currentCpuUsage.length * 100;

      cpuUsage.set(cpuUsagePercent);
      lastCpuUsage = currentCpuUsage;

      // キャッシュメトリクスの更新
      const cacheStats = global.cache?.getStats();
      if (cacheStats) {
        const hitRatio = cacheStats.hits / (cacheStats.hits + cacheStats.misses);
        cacheHitRatio.set(hitRatio);
        cacheKeys.set(cacheStats.keys);
        
        // キャッシュサイズの計算
        const cacheData = global.cache?.getAll();
        if (cacheData) {
          const totalSize = Object.values(cacheData).reduce((acc, value) => {
            return acc + Buffer.byteLength(JSON.stringify(value));
          }, 0);
          cacheSize.set(totalSize);
        }
      }
    }, 60000); // 1分ごとに更新

    logger.info('Metrics collection started');
  } catch (error) {
    logger.error('Failed to start metrics collection', { error });
  }
};

// メトリクスエンドポイントの作成
const metricsMiddleware = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Failed to get metrics', { error });
    res.status(500).end();
  }
};

// パフォーマンスモニタリングミドルウェア
const performanceMonitoringMiddleware = (req, res, next) => {
  const start = process.hrtime();
  const requestSize = parseInt(req.headers['content-length'] || 0);

  // リクエストサイズの記録
  if (requestSize > 0) {
    httpRequestSize
      .labels(req.method, req.route?.path || req.path)
      .observe(requestSize);
  }

  // レスポンスサイズの記録
  const originalSend = res.send;
  res.send = function (body) {
    const responseSize = Buffer.byteLength(body);
    httpResponseSize
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(responseSize);
    return originalSend.call(this, body);
  };

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;

    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);

    httpRequestsTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .inc();
  });

  next();
};

module.exports = {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestSize,
  httpResponseSize,
  imageProcessingDuration,
  imageProcessingSize,
  imageProcessingErrors,
  bannerGenerationDuration,
  bannerGenerationErrors,
  cacheHitRatio,
  cacheSize,
  cacheKeys,
  memoryUsage,
  cpuUsage,
  startMetricsCollection,
  metricsMiddleware,
  performanceMonitoringMiddleware,
}; 