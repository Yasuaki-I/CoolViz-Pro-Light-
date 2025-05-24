const Session = require('../models/Session');
const { logger } = require('./logger');
const { sendNotification } = require('./notifications');

// セッションの作成
const createSession = async (user, tokens, req) => {
  try {
    const deviceInfo = Session.parseDeviceInfo(
      req.headers['user-agent'],
      req.ip
    );

    const session = new Session({
      userId: user._id,
      deviceInfo,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日間
    });

    await session.save();

    // 新規セッション作成の通知
    await sendNotification({
      type: 'new_session',
      userId: user._id,
      data: {
        deviceInfo,
        timestamp: new Date()
      }
    });

    logger.info('New session created', {
      userId: user._id,
      deviceType: deviceInfo.deviceType
    });

    return session;
  } catch (error) {
    logger.error('Session creation failed', { error, userId: user._id });
    throw error;
  }
};

// セッションの検証
const verifySession = async (accessToken) => {
  try {
    const session = await Session.verifySession(accessToken);
    return session;
  } catch (error) {
    logger.error('Session verification failed', { error });
    throw error;
  }
};

// セッションの無効化
const invalidateSession = async (accessToken) => {
  try {
    await Session.invalidateSession(accessToken);
    logger.info('Session invalidated', { accessToken });
  } catch (error) {
    logger.error('Session invalidation failed', { error });
    throw error;
  }
};

// ユーザーの全セッションを無効化
const invalidateAllUserSessions = async (userId) => {
  try {
    await Session.invalidateAllUserSessions(userId);
    logger.info('All user sessions invalidated', { userId });
  } catch (error) {
    logger.error('User sessions invalidation failed', { error, userId });
    throw error;
  }
};

// アクティブセッションの取得
const getActiveSessions = async (userId) => {
  try {
    const sessions = await Session.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActivity: -1 });

    return sessions.map(session => ({
      id: session._id,
      deviceInfo: session.deviceInfo,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt
    }));
  } catch (error) {
    logger.error('Failed to get active sessions', { error, userId });
    throw error;
  }
};

// 期限切れセッションのクリーンアップ
const cleanupExpiredSessions = async () => {
  try {
    const result = await Session.removeExpiredSessions();
    logger.info('Expired sessions cleaned up', { count: result.deletedCount });
    return result.deletedCount;
  } catch (error) {
    logger.error('Session cleanup failed', { error });
    throw error;
  }
};

// 定期的なセッションクリーンアップの開始
const startSessionCleanup = () => {
  // 1時間ごとに期限切れセッションをクリーンアップ
  setInterval(async () => {
    try {
      await cleanupExpiredSessions();
    } catch (error) {
      logger.error('Scheduled session cleanup failed', { error });
    }
  }, 60 * 60 * 1000);
};

module.exports = {
  createSession,
  verifySession,
  invalidateSession,
  invalidateAllUserSessions,
  getActiveSessions,
  cleanupExpiredSessions,
  startSessionCleanup
}; 