const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createBackup,
  restoreFromBackup,
  verifyBackup
} = require('../utils/backup');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

// バックアップの作成（管理者のみ）
router.post('/create', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const backupPath = await createBackup();
    res.json({
      message: 'バックアップが作成されました',
      backupPath
    });
  } catch (error) {
    logger.error('Backup creation failed', { error });
    res.status(500).json({
      message: 'バックアップの作成に失敗しました',
      error: error.message
    });
  }
});

// バックアップの一覧取得（管理者のみ）
router.get('/list', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    const files = await fs.readdir(backupDir);
    const backups = files
      .filter(file => file.startsWith('backup-'))
      .map(file => ({
        filename: file,
        path: path.join(backupDir, file),
        timestamp: file.replace('backup-', '').replace('.json', '')
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.json({ backups });
  } catch (error) {
    logger.error('Failed to list backups', { error });
    res.status(500).json({
      message: 'バックアップ一覧の取得に失敗しました',
      error: error.message
    });
  }
});

// バックアップの検証（管理者のみ）
router.post('/verify/:filename', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const backupPath = path.join(__dirname, '../../backups', req.params.filename);
    const verification = await verifyBackup(backupPath);
    res.json(verification);
  } catch (error) {
    logger.error('Backup verification failed', { error });
    res.status(500).json({
      message: 'バックアップの検証に失敗しました',
      error: error.message
    });
  }
});

// バックアップからの復元（管理者のみ）
router.post('/restore/:filename', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const backupPath = path.join(__dirname, '../../backups', req.params.filename);
    
    // バックアップの検証
    const verification = await verifyBackup(backupPath);
    if (!verification.isValid) {
      return res.status(400).json({
        message: '無効なバックアップファイルです',
        details: verification
      });
    }

    // 復元の実行
    await restoreFromBackup(backupPath);
    res.json({
      message: 'バックアップからの復元が完了しました',
      details: verification.details
    });
  } catch (error) {
    logger.error('Backup restoration failed', { error });
    res.status(500).json({
      message: 'バックアップからの復元に失敗しました',
      error: error.message
    });
  }
});

module.exports = router; 