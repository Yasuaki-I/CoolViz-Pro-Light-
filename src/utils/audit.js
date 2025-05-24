const AuditLog = require('../models/AuditLog');
const { logger } = require('./logger');
const { sendNotification } = require('./notifications');

// 監査ログの作成
const createAuditLog = async (data) => {
  try {
    const log = await AuditLog.createLog(data);
    
    // 異常検知
    const anomalies = await AuditLog.detectAnomalies(data.userId);
    
    if (anomalies.length > 0) {
      // 異常を検知した場合、通知を送信
      await sendNotification({
        type: 'security_alert',
        userId: data.userId,
        data: {
          anomalies,
          timestamp: new Date()
        }
      });

      logger.warn('Security anomalies detected', {
        userId: data.userId,
        anomalies
      });
    }

    return log;
  } catch (error) {
    logger.error('Failed to create audit log', { error, data });
    throw error;
  }
};

// ユーザーの監査ログを取得
const getUserAuditLogs = async (userId, options = {}) => {
  try {
    return await AuditLog.getUserLogs(userId, options);
  } catch (error) {
    logger.error('Failed to get user audit logs', { error, userId });
    throw error;
  }
};

// 監査ログのミドルウェア
const auditMiddleware = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      res.locals.responseData = data;
      return originalJson.call(this, data);
    };

    try {
      await next();

      // レスポンスのステータスに基づいてログのステータスを決定
      const status = res.statusCode >= 400 ? 'failure' : 'success';

      await createAuditLog({
        userId: req.user?._id,
        action,
        status,
        details: {
          requestBody: req.body,
          responseData: res.locals.responseData,
          statusCode: res.statusCode
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (error) {
      await createAuditLog({
        userId: req.user?._id,
        action,
        status: 'failure',
        details: {
          error: error.message,
          stack: error.stack
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      throw error;
    }
  };
};

// セキュリティイベントの監視
const monitorSecurityEvents = async () => {
  try {
    const timeWindow = 24 * 60 * 60 * 1000; // 24時間
    const startTime = new Date(Date.now() - timeWindow);

    // 失敗したログイン試行の集計
    const failedLogins = await AuditLog.aggregate([
      {
        $match: {
          action: 'login',
          status: 'failure',
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gte: 5 }
        }
      }
    ]);

    // 異常なアクティビティの検出
    for (const login of failedLogins) {
      const anomalies = await AuditLog.detectAnomalies(login._id);
      
      if (anomalies.length > 0) {
        await sendNotification({
          type: 'security_alert',
          userId: login._id,
          data: {
            anomalies,
            failedLoginAttempts: login.count,
            timestamp: new Date()
          }
        });

        logger.warn('Security alert: Multiple failed login attempts', {
          userId: login._id,
          failedAttempts: login.count,
          anomalies
        });
      }
    }
  } catch (error) {
    logger.error('Security monitoring failed', { error });
  }
};

// 定期的なセキュリティ監視の開始
const startSecurityMonitoring = () => {
  // 15分ごとにセキュリティイベントを監視
  setInterval(async () => {
    try {
      await monitorSecurityEvents();
    } catch (error) {
      logger.error('Security monitoring interval failed', { error });
    }
  }, 15 * 60 * 1000);
};

module.exports = {
  createAuditLog,
  getUserAuditLogs,
  auditMiddleware,
  monitorSecurityEvents,
  startSecurityMonitoring
}; 