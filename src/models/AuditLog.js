const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'password_change',
      'password_reset',
      'session_create',
      'session_invalidate',
      'profile_update',
      'role_change',
      'banner_create',
      'banner_edit',
      'banner_delete',
      'image_upload',
      'image_delete'
    ]
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failure', 'warning']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// インデックスの作成
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });

// 監査ログの作成メソッド
auditLogSchema.statics.createLog = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    throw new Error(`監査ログの作成に失敗しました: ${error.message}`);
  }
};

// ユーザーの監査ログを取得
auditLogSchema.statics.getUserLogs = async function(userId, options = {}) {
  const {
    startDate,
    endDate,
    action,
    status,
    limit = 100,
    skip = 0
  } = options;

  const query = { userId };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  if (action) query.action = action;
  if (status) query.status = status;

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
};

// 異常検知メソッド
auditLogSchema.statics.detectAnomalies = async function(userId, timeWindow = 24 * 60 * 60 * 1000) {
  const startTime = new Date(Date.now() - timeWindow);
  
  // 失敗したログイン試行の回数を取得
  const failedLogins = await this.countDocuments({
    userId,
    action: 'login',
    status: 'failure',
    timestamp: { $gte: startTime }
  });

  // 異常なアクションの検出
  const anomalies = [];
  
  if (failedLogins >= 5) {
    anomalies.push({
      type: 'multiple_failed_logins',
      count: failedLogins,
      severity: 'high'
    });
  }

  // 短時間での複数のセッション作成
  const sessionCreations = await this.countDocuments({
    userId,
    action: 'session_create',
    timestamp: { $gte: startTime }
  });

  if (sessionCreations > 3) {
    anomalies.push({
      type: 'multiple_sessions',
      count: sessionCreations,
      severity: 'medium'
    });
  }

  return anomalies;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog; 