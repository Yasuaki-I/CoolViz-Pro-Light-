const NodeCache = require('node-cache');
const { logger } = require('./logger');
const os = require('os');

// キャッシュの設定
const CACHE_CONFIG = {
  // 基本設定
  stdTTL: 300, // 5分
  checkperiod: 60, // 1分ごとにチェック
  useClones: false, // メモリ使用量の最適化
  maxKeys: 1000, // 最大キー数

  // カスタムTTL設定
  customTTL: {
    image: 3600, // 1時間
    banner: 1800, // 30分
    generated_image: 7200, // 2時間
    template: 86400, // 24時間
  },

  // メモリ制限
  memoryLimit: {
    percentage: 0.3, // システムメモリの30%を上限
    checkInterval: 60000, // 1分ごとにチェック
  }
};

// キャッシュインスタンスの作成
const cache = new NodeCache({
  stdTTL: CACHE_CONFIG.stdTTL,
  checkperiod: CACHE_CONFIG.checkperiod,
  useClones: CACHE_CONFIG.useClones,
  maxKeys: CACHE_CONFIG.maxKeys,
});

// メモリ使用量の監視
const monitorMemoryUsage = () => {
  const totalMemory = os.totalmem();
  const memoryLimit = totalMemory * CACHE_CONFIG.memoryLimit.percentage;
  const currentMemory = process.memoryUsage().heapUsed;

  if (currentMemory > memoryLimit) {
    logger.warn('Memory usage exceeded limit, clearing cache', {
      currentMemory,
      memoryLimit,
      percentage: (currentMemory / totalMemory) * 100
    });
    clearCache();
  }
};

// メモリ監視の開始
setInterval(monitorMemoryUsage, CACHE_CONFIG.memoryLimit.checkInterval);

// キャッシュキーの生成
const generateCacheKey = (type, params) => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});
  return `${type}:${JSON.stringify(sortedParams)}`;
};

// キャッシュの取得
const getCache = async (type, params) => {
  try {
    const key = generateCacheKey(type, params);
    const value = cache.get(key);
    
    if (value) {
      logger.debug('Cache hit', { type, key });
      return value;
    }
    
    logger.debug('Cache miss', { type, key });
    return null;
  } catch (error) {
    logger.error('Cache get error', { error, type, params });
    return null;
  }
};

// キャッシュの設定
const setCache = async (type, params, value) => {
  try {
    const key = generateCacheKey(type, params);
    const ttl = CACHE_CONFIG.customTTL[type] || CACHE_CONFIG.stdTTL;
    
    const success = cache.set(key, value, ttl);
    if (success) {
      logger.debug('Cache set', { type, key, ttl });
    } else {
      logger.warn('Cache set failed', { type, key });
    }
    
    return success;
  } catch (error) {
    logger.error('Cache set error', { error, type, params });
    return false;
  }
};

// キャッシュの削除
const delCache = async (type, params) => {
  try {
    const key = generateCacheKey(type, params);
    const count = cache.del(key);
    
    if (count > 0) {
      logger.debug('Cache deleted', { type, key });
    } else {
      logger.debug('Cache delete failed - key not found', { type, key });
    }
    
    return count > 0;
  } catch (error) {
    logger.error('Cache delete error', { error, type, params });
    return false;
  }
};

// キャッシュのクリア
const clearCache = () => {
  try {
    cache.flushAll();
    logger.info('Cache cleared');
    return true;
  } catch (error) {
    logger.error('Cache clear error', { error });
    return false;
  }
};

// キャッシュの健全性チェック
const healthCheck = () => {
  try {
    const stats = cache.getStats();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      stats: {
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        hitRatio: stats.hits / (stats.hits + stats.misses) || 0,
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        }
      }
    };
  } catch (error) {
    logger.error('Cache health check error', { error });
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// キャッシュの最適化
const optimizeCache = () => {
  try {
    const stats = cache.getStats();
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const memoryPercentage = memoryUsage.heapUsed / totalMemory;

    // メモリ使用量が制限を超えている場合
    if (memoryPercentage > CACHE_CONFIG.memoryLimit.percentage) {
      logger.warn('Memory usage high, optimizing cache', {
        memoryPercentage,
        limit: CACHE_CONFIG.memoryLimit.percentage
      });

      // ヒット率の低いキーを削除
      const keys = cache.keys();
      const keyStats = keys.map(key => ({
        key,
        hits: cache.getStats().hits,
        lastAccess: cache.getTtl(key)
      }));

      // 最後のアクセスが古く、ヒット率の低いキーを削除
      const oldKeys = keyStats
        .filter(stat => stat.lastAccess < Date.now() - CACHE_CONFIG.stdTTL * 1000)
        .sort((a, b) => a.hits - b.hits)
        .slice(0, Math.floor(keys.length * 0.2)); // 20%のキーを削除

      oldKeys.forEach(stat => cache.del(stat.key));
      logger.info('Cache optimized', { removedKeys: oldKeys.length });
    }

    return {
      status: 'optimized',
      stats: {
        keys: stats.keys,
        memoryPercentage,
        removedKeys: oldKeys?.length || 0
      }
    };
  } catch (error) {
    logger.error('Cache optimization error', { error });
    return {
      status: 'error',
      error: error.message
    };
  }
};

// 定期的なキャッシュ最適化
setInterval(optimizeCache, CACHE_CONFIG.checkperiod * 1000);

module.exports = {
  get: getCache,
  set: setCache,
  del: delCache,
  clear: clearCache,
  healthCheck,
  optimize: optimizeCache
}; 