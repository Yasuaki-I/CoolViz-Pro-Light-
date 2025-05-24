const { logger } = require('./logger');
const { sendNotification } = require('./notifications');
const { register } = require('./metrics');
const os = require('os');

// レポート生成の設定
const REPORT_CONFIG = {
  interval: 24 * 60 * 60 * 1000, // 24時間
  metrics: {
    http: {
      duration: { threshold: 1.0 }, // 1秒
      errorRate: { threshold: 0.05 }, // 5%
      responseSize: { threshold: 1024 * 1024 } // 1MB
    },
    image: {
      duration: { threshold: 5.0 }, // 5秒
      errorRate: { threshold: 0.02 }, // 2%
      size: { threshold: 5 * 1024 * 1024 } // 5MB
    },
    banner: {
      duration: { threshold: 10.0 }, // 10秒
      errorRate: { threshold: 0.03 }, // 3%
    },
    cache: {
      hitRatio: { threshold: 0.7 }, // 70%
      size: { threshold: 1024 * 1024 * 1024 } // 1GB
    },
    system: {
      memory: { threshold: 0.8 }, // 80%
      cpu: { threshold: 0.7 } // 70%
    }
  }
};

// メトリクスデータの取得
const getMetricsData = async () => {
  try {
    const metrics = await register.getMetricsAsJSON();
    const data = {};

    metrics.forEach(metric => {
      if (metric.type === 'gauge' || metric.type === 'counter') {
        data[metric.name] = metric.value;
      } else if (metric.type === 'histogram') {
        data[metric.name] = {
          sum: metric.sum,
          count: metric.count,
          buckets: metric.buckets
        };
      }
    });

    return data;
  } catch (error) {
    logger.error('Failed to get metrics data', { error });
    return null;
  }
};

// パフォーマンス分析
const analyzePerformance = (metrics) => {
  const analysis = {
    issues: [],
    recommendations: [],
    summary: {
      status: 'healthy',
      score: 100
    }
  };

  // HTTPパフォーマンス分析
  const httpDuration = metrics['http_request_duration_seconds']?.sum / metrics['http_request_duration_seconds']?.count || 0;
  const httpErrorRate = metrics['http_requests_total']?.value / metrics['http_requests_total']?.count || 0;

  if (httpDuration > REPORT_CONFIG.metrics.http.duration.threshold) {
    analysis.issues.push({
      type: 'http',
      metric: 'duration',
      value: httpDuration,
      threshold: REPORT_CONFIG.metrics.http.duration.threshold,
      severity: 'warning'
    });
    analysis.recommendations.push('Consider optimizing slow HTTP endpoints');
    analysis.summary.score -= 10;
  }

  if (httpErrorRate > REPORT_CONFIG.metrics.http.errorRate.threshold) {
    analysis.issues.push({
      type: 'http',
      metric: 'error_rate',
      value: httpErrorRate,
      threshold: REPORT_CONFIG.metrics.http.errorRate.threshold,
      severity: 'critical'
    });
    analysis.recommendations.push('Investigate high HTTP error rate');
    analysis.summary.score -= 20;
  }

  // 画像処理パフォーマンス分析
  const imageDuration = metrics['image_processing_duration_seconds']?.sum / metrics['image_processing_duration_seconds']?.count || 0;
  const imageErrorRate = metrics['image_processing_errors_total']?.value / metrics['image_processing_duration_seconds']?.count || 0;

  if (imageDuration > REPORT_CONFIG.metrics.image.duration.threshold) {
    analysis.issues.push({
      type: 'image',
      metric: 'duration',
      value: imageDuration,
      threshold: REPORT_CONFIG.metrics.image.duration.threshold,
      severity: 'warning'
    });
    analysis.recommendations.push('Consider optimizing image processing operations');
    analysis.summary.score -= 10;
  }

  if (imageErrorRate > REPORT_CONFIG.metrics.image.errorRate.threshold) {
    analysis.issues.push({
      type: 'image',
      metric: 'error_rate',
      value: imageErrorRate,
      threshold: REPORT_CONFIG.metrics.image.errorRate.threshold,
      severity: 'critical'
    });
    analysis.recommendations.push('Investigate image processing errors');
    analysis.summary.score -= 20;
  }

  // キャッシュパフォーマンス分析
  const cacheHitRatio = metrics['cache_hit_ratio']?.value || 0;
  const cacheSize = metrics['cache_size_bytes']?.value || 0;

  if (cacheHitRatio < REPORT_CONFIG.metrics.cache.hitRatio.threshold) {
    analysis.issues.push({
      type: 'cache',
      metric: 'hit_ratio',
      value: cacheHitRatio,
      threshold: REPORT_CONFIG.metrics.cache.hitRatio.threshold,
      severity: 'warning'
    });
    analysis.recommendations.push('Review cache strategy and TTL settings');
    analysis.summary.score -= 10;
  }

  if (cacheSize > REPORT_CONFIG.metrics.cache.size.threshold) {
    analysis.issues.push({
      type: 'cache',
      metric: 'size',
      value: cacheSize,
      threshold: REPORT_CONFIG.metrics.cache.size.threshold,
      severity: 'warning'
    });
    analysis.recommendations.push('Consider implementing cache eviction policy');
    analysis.summary.score -= 5;
  }

  // システムリソース分析
  const memoryUsage = metrics['memory_usage_bytes']?.value / os.totalmem() || 0;
  const cpuUsage = metrics['cpu_usage_percent']?.value / 100 || 0;

  if (memoryUsage > REPORT_CONFIG.metrics.system.memory.threshold) {
    analysis.issues.push({
      type: 'system',
      metric: 'memory',
      value: memoryUsage,
      threshold: REPORT_CONFIG.metrics.system.memory.threshold,
      severity: 'critical'
    });
    analysis.recommendations.push('Investigate high memory usage');
    analysis.summary.score -= 15;
  }

  if (cpuUsage > REPORT_CONFIG.metrics.system.cpu.threshold) {
    analysis.issues.push({
      type: 'system',
      metric: 'cpu',
      value: cpuUsage,
      threshold: REPORT_CONFIG.metrics.system.cpu.threshold,
      severity: 'critical'
    });
    analysis.recommendations.push('Consider scaling or optimizing CPU-intensive operations');
    analysis.summary.score -= 15;
  }

  // ステータスの更新
  if (analysis.summary.score < 60) {
    analysis.summary.status = 'critical';
  } else if (analysis.summary.score < 80) {
    analysis.summary.status = 'warning';
  }

  return analysis;
};

// レポートの生成
const generateReport = async () => {
  try {
    const metrics = await getMetricsData();
    if (!metrics) {
      throw new Error('Failed to get metrics data');
    }

    const analysis = analyzePerformance(metrics);
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      analysis,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: os.cpus()
      }
    };

    // レポートの保存
    const reportPath = `reports/performance-${new Date().toISOString().split('T')[0]}.json`;
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 通知の送信
    if (analysis.issues.length > 0) {
      const message = {
        title: `Performance Report - ${analysis.summary.status.toUpperCase()}`,
        text: `Score: ${analysis.summary.score}\n\nIssues:\n${analysis.issues.map(issue => 
          `- ${issue.type.toUpperCase()} ${issue.metric}: ${issue.value} (threshold: ${issue.threshold})`
        ).join('\n')}\n\nRecommendations:\n${analysis.recommendations.map(rec => 
          `- ${rec}`
        ).join('\n')}`,
        severity: analysis.summary.status === 'critical' ? 'critical' : 'warning'
      };

      await sendNotification(message);
    }

    logger.info('Performance report generated', { reportPath });
    return report;
  } catch (error) {
    logger.error('Failed to generate performance report', { error });
    throw error;
  }
};

// レポート生成の開始
const startReportGeneration = () => {
  try {
    // 初回レポートの生成
    generateReport();

    // 定期的なレポート生成
    setInterval(generateReport, REPORT_CONFIG.interval);

    logger.info('Performance report generation started');
  } catch (error) {
    logger.error('Failed to start performance report generation', { error });
  }
};

module.exports = {
  generateReport,
  startReportGeneration
}; 