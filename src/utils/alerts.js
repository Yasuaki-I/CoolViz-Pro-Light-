const { sendNotification } = require('./notifications');
const logger = require('./logger');
const {
  httpRequestDuration,
  imageProcessingDuration,
  bannerGenerationDuration,
  cacheHitRatio,
  memoryUsage,
  cpuUsage
} = require('./metrics');

// アラートの閾値設定
const ALERT_THRESHOLDS = {
  httpRequestDuration: 2, // 秒
  imageProcessingDuration: 5, // 秒
  bannerGenerationDuration: 30, // 秒
  cacheHitRatio: 50, // パーセント
  memoryUsage: 80, // パーセント
  cpuUsage: 70 // パーセント
};

// アラートのクールダウン期間（5分）
const ALERT_COOLDOWN = 5 * 60 * 1000;

// アラートの最終送信時刻を記録
const lastAlertTimes = new Map();

// アラート送信
async function sendAlert(metric, value, threshold, severity = 'warning') {
  const now = Date.now();
  const lastAlertTime = lastAlertTimes.get(metric) || 0;

  // クールダウン期間内の場合は送信しない
  if (now - lastAlertTime < ALERT_COOLDOWN) {
    return;
  }

  const message = `${metric}: ${value} (threshold: ${threshold})`;
  await sendNotification(message, severity);
  lastAlertTimes.set(metric, now);
}

// HTTPリクエスト時間のチェック
async function checkHttpRequestDuration() {
  const duration = httpRequestDuration.get().sum / httpRequestDuration.get().count;
  if (duration > ALERT_THRESHOLDS.httpRequestDuration) {
    await sendAlert('HTTP Request Duration', duration.toFixed(2), ALERT_THRESHOLDS.httpRequestDuration);
  }
}

// 画像処理時間のチェック
async function checkImageProcessingDuration() {
  const duration = imageProcessingDuration.get().sum / imageProcessingDuration.get().count;
  if (duration > ALERT_THRESHOLDS.imageProcessingDuration) {
    await sendAlert('Image Processing Duration', duration.toFixed(2), ALERT_THRESHOLDS.imageProcessingDuration);
  }
}

// バナー生成時間のチェック
async function checkBannerGenerationDuration() {
  const duration = bannerGenerationDuration.get().sum / bannerGenerationDuration.get().count;
  if (duration > ALERT_THRESHOLDS.bannerGenerationDuration) {
    await sendAlert('Banner Generation Duration', duration.toFixed(2), ALERT_THRESHOLDS.bannerGenerationDuration);
  }
}

// キャッシュヒット率のチェック
async function checkCacheHitRatio() {
  const ratio = cacheHitRatio.get();
  if (ratio < ALERT_THRESHOLDS.cacheHitRatio) {
    await sendAlert('Cache Hit Ratio', ratio.toFixed(2), ALERT_THRESHOLDS.cacheHitRatio);
  }
}

// メモリ使用率のチェック
async function checkMemoryUsage() {
  const usage = memoryUsage.get();
  if (usage > ALERT_THRESHOLDS.memoryUsage) {
    await sendAlert('Memory Usage', usage.toFixed(2), ALERT_THRESHOLDS.memoryUsage, 'critical');
  }
}

// CPU使用率のチェック
async function checkCpuUsage() {
  const usage = cpuUsage.get();
  if (usage > ALERT_THRESHOLDS.cpuUsage) {
    await sendAlert('CPU Usage', usage.toFixed(2), ALERT_THRESHOLDS.cpuUsage, 'critical');
  }
}

// アラートチェックの開始
function startAlertChecks() {
  setInterval(async () => {
    try {
      await Promise.all([
        checkHttpRequestDuration(),
        checkImageProcessingDuration(),
        checkBannerGenerationDuration(),
        checkCacheHitRatio(),
        checkMemoryUsage(),
        checkCpuUsage()
      ]);
    } catch (error) {
      logger.error('Error in alert checks:', error);
    }
  }, 60000); // 1分ごとにチェック
}

module.exports = {
  checkHttpRequestDuration,
  checkImageProcessingDuration,
  checkBannerGenerationDuration,
  checkCacheHitRatio,
  checkMemoryUsage,
  checkCpuUsage,
  startAlertChecks
}; 