const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  generatePerformanceReport,
  resetMetrics,
  cacheManager
} = require('../utils/performance');
const { logger } = require('../utils/logger');

// パフォーマンスレポートの取得（管理者のみ）
router.get('/report', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const report = generatePerformanceReport();
    res.json(report);
  } catch (error) {
    logger.error('Failed to generate performance report', { error });
    res.status(500).json({
      message: 'パフォーマンスレポートの生成に失敗しました',
      error: error.message
    });
  }
});

// メトリクスのリセット（管理者のみ）
router.post('/reset', authenticate, authorize(['admin']), async (req, res) => {
  try {
    resetMetrics();
    res.json({ message: 'メトリクスがリセットされました' });
  } catch (error) {
    logger.error('Failed to reset metrics', { error });
    res.status(500).json({
      message: 'メトリクスのリセットに失敗しました',
      error: error.message
    });
  }
});

// キャッシュの管理（管理者のみ）
router.post('/cache/clear', authenticate, authorize(['admin']), async (req, res) => {
  try {
    cacheManager.clear();
    res.json({ message: 'キャッシュがクリアされました' });
  } catch (error) {
    logger.error('Failed to clear cache', { error });
    res.status(500).json({
      message: 'キャッシュのクリアに失敗しました',
      error: error.message
    });
  }
});

// キャッシュの状態確認（管理者のみ）
router.get('/cache/status', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const stats = cacheManager.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get cache status', { error });
    res.status(500).json({
      message: 'キャッシュの状態取得に失敗しました',
      error: error.message
    });
  }
});

module.exports = router; 