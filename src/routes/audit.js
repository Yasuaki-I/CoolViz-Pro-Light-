const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getUserAuditLogs } = require('../utils/audit');
const { logger } = require('../utils/logger');

// ユーザーの監査ログを取得（管理者のみ）
router.get('/user/:userId', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      startDate,
      endDate,
      action,
      status,
      limit,
      skip
    } = req.query;

    const logs = await getUserAuditLogs(userId, {
      startDate,
      endDate,
      action,
      status,
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0
    });

    res.json({ logs });
  } catch (error) {
    logger.error('Failed to get user audit logs', { error, userId: req.params.userId });
    res.status(500).json({ message: '監査ログの取得に失敗しました' });
  }
});

// 自分の監査ログを取得
router.get('/me', authenticate, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      action,
      status,
      limit,
      skip
    } = req.query;

    const logs = await getUserAuditLogs(req.user._id, {
      startDate,
      endDate,
      action,
      status,
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0
    });

    res.json({ logs });
  } catch (error) {
    logger.error('Failed to get own audit logs', { error, userId: req.user._id });
    res.status(500).json({ message: '監査ログの取得に失敗しました' });
  }
});

// 監査ログの統計情報を取得（管理者のみ）
router.get('/stats', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const timeWindow = {
      $gte: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      $lte: endDate ? new Date(endDate) : new Date()
    };

    const stats = await AuditLog.aggregate([
      {
        $match: {
          timestamp: timeWindow
        }
      },
      {
        $group: {
          _id: {
            action: '$action',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.action',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    res.json({ stats });
  } catch (error) {
    logger.error('Failed to get audit log stats', { error });
    res.status(500).json({ message: '統計情報の取得に失敗しました' });
  }
});

module.exports = router; 