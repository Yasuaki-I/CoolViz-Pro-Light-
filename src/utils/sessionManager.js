/**
 * インメモリセッションストレージ
 * 注意: 実際の本番環境では、データベースやRedisなど永続的なストレージを使用すべきです
 */
const sessions = {};

// セッションの有効期限（ミリ秒）- 24時間
const SESSION_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * ユーザーIDに基づいてセッションを取得する
 * @param {string} userId - LINEユーザーID
 * @return {Object|null} ユーザーセッションまたはnull
 */
function getUserSession(userId) {
  // 期限切れのセッションを定期的にクリーンアップ
  cleanupExpiredSessions();
  
  // セッションがあれば取得
  return sessions[userId] || null;
}

/**
 * ユーザーセッションを更新する
 * @param {Object} session - セッションオブジェクト
 */
function updateUserSession(session) {
  if (!session || !session.userId) {
    throw new Error('セッションにはユーザーIDが必要です');
  }
  
  // 最終操作時間を更新
  session.lastInteraction = Date.now();
  
  // セッションを保存
  sessions[session.userId] = session;
}

/**
 * ユーザーセッションを削除する
 * @param {string} userId - LINEユーザーID
 */
function deleteUserSession(userId) {
  if (sessions[userId]) {
    delete sessions[userId];
  }
}

/**
 * 期限切れのセッションをクリーンアップする
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  
  Object.keys(sessions).forEach(userId => {
    const session = sessions[userId];
    // 最後の操作から一定時間経過していたらセッションを削除
    if (now - session.lastInteraction > SESSION_EXPIRY) {
      delete sessions[userId];
    }
  });
}

module.exports = {
  getUserSession,
  updateUserSession,
  deleteUserSession
}; 