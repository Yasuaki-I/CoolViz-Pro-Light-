const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');
const { sendNotification } = require('./notifications');
const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');

// バックアップディレクトリの設定
const BACKUP_DIR = path.join(__dirname, '../../backups');
const MAX_BACKUPS = 7; // 保持するバックアップの最大数

// バックアップの作成
const createBackup = async () => {
  try {
    // バックアップディレクトリの作成
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

    // バックアップデータの収集
    const backupData = {
      timestamp,
      users: await User.find({}),
      sessions: await Session.find({}),
      auditLogs: await AuditLog.find({})
    };

    // バックアップファイルの作成
    await fs.writeFile(
      `${backupPath}.json`,
      JSON.stringify(backupData, null, 2)
    );

    // 古いバックアップの削除
    await cleanupOldBackups();

    logger.info('Backup created successfully', { timestamp });
    return backupPath;
  } catch (error) {
    logger.error('Backup creation failed', { error });
    throw error;
  }
};

// 古いバックアップの削除
const cleanupOldBackups = async () => {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = files
      .filter(file => file.startsWith('backup-'))
      .sort()
      .reverse();

    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        await fs.unlink(path.join(BACKUP_DIR, file));
      }
      logger.info('Old backups cleaned up', { deleted: toDelete.length });
    }
  } catch (error) {
    logger.error('Backup cleanup failed', { error });
    throw error;
  }
};

// バックアップからの復元
const restoreFromBackup = async (backupPath) => {
  try {
    const backupData = JSON.parse(
      await fs.readFile(backupPath, 'utf-8')
    );

    // データベースのクリア
    await User.deleteMany({});
    await Session.deleteMany({});
    await AuditLog.deleteMany({});

    // データの復元
    await User.insertMany(backupData.users);
    await Session.insertMany(backupData.sessions);
    await AuditLog.insertMany(backupData.auditLogs);

    logger.info('Backup restored successfully', { backupPath });
    
    // 管理者に通知
    await sendNotification({
      type: 'system_alert',
      data: {
        message: 'システムがバックアップから復元されました',
        timestamp: new Date(),
        backupPath
      }
    });

    return true;
  } catch (error) {
    logger.error('Backup restoration failed', { error, backupPath });
    throw error;
  }
};

// バックアップの検証
const verifyBackup = async (backupPath) => {
  try {
    const backupData = JSON.parse(
      await fs.readFile(backupPath, 'utf-8')
    );

    const verification = {
      isValid: true,
      details: {
        users: backupData.users.length,
        sessions: backupData.sessions.length,
        auditLogs: backupData.auditLogs.length,
        timestamp: backupData.timestamp
      }
    };

    // データの整合性チェック
    if (!verification.details.users || !verification.details.sessions) {
      verification.isValid = false;
      verification.error = 'Invalid backup data structure';
    }

    return verification;
  } catch (error) {
    logger.error('Backup verification failed', { error, backupPath });
    throw error;
  }
};

// 定期的なバックアップの開始
const startScheduledBackups = () => {
  // 毎日午前3時にバックアップを実行
  const scheduleBackup = () => {
    const now = new Date();
    const nextBackup = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      3, 0, 0
    );
    const delay = nextBackup.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        await createBackup();
        scheduleBackup(); // 次のバックアップをスケジュール
      } catch (error) {
        logger.error('Scheduled backup failed', { error });
        // エラーが発生しても次のバックアップをスケジュール
        scheduleBackup();
      }
    }, delay);
  };

  scheduleBackup();
};

module.exports = {
  createBackup,
  restoreFromBackup,
  verifyBackup,
  startScheduledBackups
}; 