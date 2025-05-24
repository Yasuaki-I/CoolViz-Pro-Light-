const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['access', 'refresh'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// インデックスの作成
tokenSchema.index({ token: 1 });
tokenSchema.index({ userId: 1, type: 1 });
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// トークンの検証メソッド
tokenSchema.statics.verifyToken = async function(token, type) {
  const tokenDoc = await this.findOne({
    token,
    type,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).populate('userId');

  return tokenDoc;
};

// トークンの無効化メソッド
tokenSchema.statics.revokeToken = async function(token) {
  return this.updateOne(
    { token },
    { $set: { isRevoked: true } }
  );
};

// ユーザーの全トークンを無効化
tokenSchema.statics.revokeAllUserTokens = async function(userId) {
  return this.updateMany(
    { userId, isRevoked: false },
    { $set: { isRevoked: true } }
  );
};

// 期限切れトークンの削除
tokenSchema.statics.removeExpiredTokens = async function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token; 