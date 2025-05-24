const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybranding';

// データベース接続の設定
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('MongoDB connected successfully');

    // 接続エラーのハンドリング
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    // 接続切断のハンドリング
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // アプリケーション終了時の接続切断
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error during MongoDB connection closure:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB; 