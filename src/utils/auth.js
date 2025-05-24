const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { logger } = require('./logger');

// 認証の設定
const AUTH_CONFIG = {
  // JWT設定
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '24h',
    refreshExpiresIn: '7d'
  },

  // パスワード設定
  password: {
    saltRounds: 10,
    minLength: 8
  },

  // ロール設定
  roles: {
    admin: {
      level: 3,
      permissions: ['*']
    },
    editor: {
      level: 2,
      permissions: ['read', 'write', 'delete']
    },
    user: {
      level: 1,
      permissions: ['read', 'write']
    }
  }
};

// トークンの生成
const generateTokens = (user) => {
  try {
    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        permissions: AUTH_CONFIG.roles[user.role].permissions
      },
      AUTH_CONFIG.jwt.secret,
      { expiresIn: AUTH_CONFIG.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      AUTH_CONFIG.jwt.secret,
      { expiresIn: AUTH_CONFIG.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Token generation error', { error, userId: user.id });
    throw error;
  }
};

// トークンの検証
const verifyToken = (token) => {
  try {
    return jwt.verify(token, AUTH_CONFIG.jwt.secret);
  } catch (error) {
    logger.warn('Token verification failed', { error });
    throw error;
  }
};

// パスワードのハッシュ化
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, AUTH_CONFIG.password.saltRounds);
  } catch (error) {
    logger.error('Password hashing error', { error });
    throw error;
  }
};

// パスワードの検証
const verifyPassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Password verification error', { error });
    throw error;
  }
};

// パスワードの強度チェック
const validatePassword = (password) => {
  const errors = [];

  if (password.length < AUTH_CONFIG.password.minLength) {
    errors.push(`Password must be at least ${AUTH_CONFIG.password.minLength} characters long`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// 権限のチェック
const checkPermission = (userRole, requiredPermission) => {
  try {
    const roleConfig = AUTH_CONFIG.roles[userRole];
    if (!roleConfig) {
      return false;
    }

    return roleConfig.permissions.includes('*') || 
           roleConfig.permissions.includes(requiredPermission);
  } catch (error) {
    logger.error('Permission check error', { error, userRole, requiredPermission });
    return false;
  }
};

// 認証ミドルウェア
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Authentication failed', { error });
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// 権限チェックミドルウェア
const authorize = (requiredPermission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      if (!checkPermission(req.user.role, requiredPermission)) {
        throw new Error('Insufficient permissions');
      }

      next();
    } catch (error) {
      logger.warn('Authorization failed', { error, user: req.user });
      res.status(403).json({ error: 'Authorization failed' });
    }
  };
};

module.exports = {
  generateTokens,
  verifyToken,
  hashPassword,
  verifyPassword,
  validatePassword,
  checkPermission,
  authenticate,
  authorize,
  AUTH_CONFIG
}; 