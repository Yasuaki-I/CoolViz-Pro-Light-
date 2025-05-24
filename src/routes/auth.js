const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const User = require('../models/User');
const Token = require('../models/Token');
const {
  generateTokens,
  validatePassword,
  authenticate
} = require('../utils/auth');
const { sendNotification } = require('../utils/notifications');
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../utils/email');

// バリデーションルール
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// ユーザー登録
router.post('/register', registerValidation, async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role = 'user' } = req.body;

    // パスワードの強度チェック
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // ユーザーの存在確認
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        field: existingUser.email === email ? 'email' : 'username'
      });
    }

    // ユーザーの作成
    const user = new User({
      username,
      email,
      password,
      role
    });

    await user.save();

    // トークンの生成
    const tokens = generateTokens(user);

    // アクセストークンの保存
    await new Token({
      userId: user._id,
      token: tokens.accessToken,
      type: 'access',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間
    }).save();

    // リフレッシュトークンの保存
    await new Token({
      userId: user._id,
      token: tokens.refreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日間
    }).save();

    logger.info('User registered successfully', { userId: user._id, role });

    // 通知の送信
    await sendNotification({
      type: 'user_registered',
      userId: user._id,
      data: {
        username: user.username,
        email: user.email
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      ...tokens
    });
  } catch (error) {
    logger.error('Registration failed', { error });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ログイン
router.post('/login', loginValidation, async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // ユーザーの検索
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // アカウントロックのチェック
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(401).json({
        error: 'Account is locked',
        lockUntil: user.lockUntil
      });
    }

    // パスワードの検証
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      // ログイン試行回数の増加
      await user.incrementLoginAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ログイン成功時の処理
    await user.resetLoginAttempts();

    // トークンの生成
    const tokens = generateTokens(user);

    // 既存のトークンを無効化
    await Token.revokeAllUserTokens(user._id);

    // 新しいトークンの保存
    await new Token({
      userId: user._id,
      token: tokens.accessToken,
      type: 'access',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }).save();

    await new Token({
      userId: user._id,
      token: tokens.refreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }).save();

    logger.info('User logged in successfully', { userId: user._id });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      ...tokens
    });
  } catch (error) {
    logger.error('Login failed', { error });
    res.status(500).json({ error: 'Login failed' });
  }
});

// トークンの更新
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // リフレッシュトークンの検証
    const tokenDoc = await Token.verifyToken(refreshToken, 'refresh');
    if (!tokenDoc) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // 新しいトークンの生成
    const tokens = generateTokens(user);

    // 古いトークンの無効化
    await Token.revokeToken(refreshToken);

    // 新しいトークンの保存
    await new Token({
      userId: user._id,
      token: tokens.accessToken,
      type: 'access',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }).save();

    await new Token({
      userId: user._id,
      token: tokens.refreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }).save();

    logger.info('Token refreshed successfully', { userId: user._id });

    res.json({
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    logger.error('Token refresh failed', { error });
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ログアウト
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    
    // トークンの無効化
    await Token.revokeToken(token);

    logger.info('User logged out successfully', { userId: req.user.id });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout failed', { error });
    res.status(500).json({ error: 'Logout failed' });
  }
});

// パスワードリセットリクエスト
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('有効なメールアドレスを入力してください')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // ユーザーの検索
    const user = await User.findOne({ email });
    if (!user) {
      // セキュリティのため、ユーザーが存在しない場合でも成功レスポンスを返す
      return res.json({
        message: 'パスワードリセットの手順をメールで送信しました'
      });
    }

    // リセットトークンの生成
    const resetToken = user.generateResetToken();
    await user.save();

    // リセットメールの送信
    await sendPasswordResetEmail(email, resetToken);

    logger.info('Password reset requested', { userId: user._id });

    res.json({
      message: 'パスワードリセットの手順をメールで送信しました'
    });
  } catch (error) {
    logger.error('Password reset request failed', { error });
    res.status(500).json({ error: 'パスワードリセットのリクエストに失敗しました' });
  }
});

// パスワードリセットの実行
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('トークンが必要です'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('パスワードは8文字以上必要です')
], async (req, res) => {
  try {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // トークンと有効期限の検証
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        error: '無効なトークンか、トークンの有効期限が切れています'
      });
    }

    // パスワードの強度チェック
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'パスワードの検証に失敗しました',
        details: passwordValidation.errors
      });
    }

    // パスワードの更新
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // 既存のトークンを無効化
    await Token.revokeAllUserTokens(user._id);

    // パスワード変更完了メールの送信
    await sendPasswordChangedEmail(user.email);

    logger.info('Password reset completed', { userId: user._id });

    res.json({
      message: 'パスワードが正常に更新されました'
    });
  } catch (error) {
    logger.error('Password reset failed', { error });
    res.status(500).json({ error: 'パスワードのリセットに失敗しました' });
  }
});

module.exports = router; 