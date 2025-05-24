const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getActiveSessions,
  invalidateSession,
  invalidateAllUserSessions
} = require('../utils/session');
const { logger } = require('../utils/logger');

// アクティブセッションの取得
router.get('/active', authenticate, async (req, res) => {
  try {
    const sessions = await getActiveSessions(req.user._id);
    res.json({ sessions });
  } catch (error) {
    logger.error('Failed to get active sessions', { error, userId: req.user._id });
    res.status(500).json({ message: 'セッション情報の取得に失敗しました' });
  }
});

// 特定のセッションを無効化
router.delete('/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await invalidateSession(sessionId);
    res.json({ message: 'セッションを無効化しました' });
  } catch (error) {
    logger.error('Failed to invalidate session', { error, sessionId: req.params.sessionId });
    res.status(500).json({ message: 'セッションの無効化に失敗しました' });
  }
});

// 全セッションを無効化
router.delete('/all', authenticate, async (req, res) => {
  try {
    await invalidateAllUserSessions(req.user._id);
    res.json({ message: 'すべてのセッションを無効化しました' });
  } catch (error) {
    logger.error('Failed to invalidate all sessions', { error, userId: req.user._id });
    res.status(500).json({ message: 'セッションの無効化に失敗しました' });
  }
});

module.exports = router; 