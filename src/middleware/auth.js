const jwt = require('jsonwebtoken');
const { verifySession, invalidateSession } = require('../utils/session');
const { logger } = require('../utils/logger');
const User = require('../models/User');

// JWTトークンの検証
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const session = await verifySession(token);
    
    if (!session) {
      throw new Error('Invalid session');
    }

    return decoded;
  } catch (error) {
    logger.error('Token verification failed', { error });
    throw error;
  }
};

// 認証ミドルウェア
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'ユーザーが無効です' });
    }

    req.user = user;
    req.session = decoded;
    next();
  } catch (error) {
    logger.error('Authentication failed', { error });
    return res.status(401).json({ message: '認証に失敗しました' });
  }
};

// ロールベースの認可ミドルウェア
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '認証が必要です' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'アクセス権限がありません' });
    }

    next();
  };
};

// ログアウトミドルウェア
const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await invalidateSession(token);
    }
    next();
  } catch (error) {
    logger.error('Logout failed', { error });
    next(error);
  }
};

module.exports = {
  authenticate,
  authorize,
  logout
}; 