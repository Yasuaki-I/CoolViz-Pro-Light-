const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    deviceType: String,
    browser: String,
    os: String
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// インデックスの作成
sessionSchema.index({ userId: 1 });
sessionSchema.index({ accessToken: 1 });
sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// セッションの検証メソッド
sessionSchema.statics.verifySession = async function(accessToken) {
  const session = await this.findOne({
    accessToken,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId');

  if (session) {
    // 最終アクティビティの更新
    session.lastActivity = new Date();
    await session.save();
  }

  return session;
};

// セッションの無効化メソッド
sessionSchema.statics.invalidateSession = async function(accessToken) {
  return this.updateOne(
    { accessToken },
    { $set: { isActive: false } }
  );
};

// ユーザーの全セッションを無効化
sessionSchema.statics.invalidateAllUserSessions = async function(userId) {
  return this.updateMany(
    { userId, isActive: true },
    { $set: { isActive: false } }
  );
};

// 期限切れセッションの削除
sessionSchema.statics.removeExpiredSessions = async function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// デバイス情報の解析メソッド
sessionSchema.statics.parseDeviceInfo = function(userAgent, ipAddress) {
  const ua = require('ua-parser-js')(userAgent);
  
  return {
    userAgent,
    ipAddress,
    deviceType: ua.device.type || 'desktop',
    browser: `${ua.browser.name} ${ua.browser.version}`,
    os: `${ua.os.name} ${ua.os.version}`
  };
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session; 