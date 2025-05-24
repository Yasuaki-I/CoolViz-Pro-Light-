const questionTemplate = require('../models/questionTemplate');

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

/**
 * 新しいセッションを初期化する
 * @param {string} userId - LINEユーザーID
 * @returns {Object} - 初期化されたセッション
 */
function initializeSession(userId) {
  const session = {
    userId,
    currentStep: questionTemplate.DIAGNOSTIC_STEPS.START,
    currentQuestionIndex: 0,
    answers: {},
    results: null,
    lastInteraction: Date.now()
  };
  
  updateUserSession(session);
  return session;
}

/**
 * 次の質問に進む
 * @param {Object} session - ユーザーセッション
 * @param {string} answer - 現在の質問に対する回答
 * @returns {Object} - 更新されたセッション
 */
function moveToNextQuestion(session, answer) {
  // 現在のステップに対応するセクションを取得
  const currentSection = questionTemplate.getSectionByStep(session.currentStep);
  
  if (currentSection) {
    // セクション内の質問リストを取得
    const questions = questionTemplate.getQuestionsBySection(currentSection);
    
    // 現在の質問IDを取得
    if (session.currentQuestionIndex < questions.length) {
      const currentQuestion = questions[session.currentQuestionIndex];
      
      // 回答を保存
      session.answers[currentQuestion.id] = answer;
      
      // 次の質問インデックスに進む
      session.currentQuestionIndex++;
      
      // セクション内の質問がまだ残っている場合
      if (session.currentQuestionIndex < questions.length) {
        updateUserSession(session);
        return session;
      }
    }
    
    // セクション内の質問が終わったら次のステップへ
    session.currentStep = questionTemplate.getNextStep(session.currentStep);
    session.currentQuestionIndex = 0;
  } else {
    // 現在のステップがセクションに対応していない場合（スタートなど）
    session.currentStep = questionTemplate.getNextStep(session.currentStep);
    session.currentQuestionIndex = 0;
  }
  
  updateUserSession(session);
  return session;
}

/**
 * 現在の質問を取得する
 * @param {Object} session - ユーザーセッション
 * @returns {Object|null} - 現在の質問オブジェクト
 */
function getCurrentQuestion(session) {
  // 診断完了ステップの場合はnullを返す
  if (session.currentStep === questionTemplate.DIAGNOSTIC_STEPS.COMPLETED) {
    return null;
  }
  
  // スタートステップの場合は特別な質問を返す
  if (session.currentStep === questionTemplate.DIAGNOSTIC_STEPS.START) {
    return {
      text: questionTemplate.STEP_QUESTIONS[questionTemplate.DIAGNOSTIC_STEPS.START],
      isStepIntro: true
    };
  }
  
  // 現在のステップに対応するセクションを取得
  const currentSection = questionTemplate.getSectionByStep(session.currentStep);
  if (!currentSection) return null;
  
  // セクション内の質問リストを取得
  const questions = questionTemplate.getQuestionsBySection(currentSection);
  
  // ステップの最初の質問の場合、ステップ紹介を表示
  if (session.currentQuestionIndex === 0) {
    return {
      text: questionTemplate.STEP_QUESTIONS[session.currentStep],
      isStepIntro: true
    };
  }
  
  // 現在の質問を取得
  if (session.currentQuestionIndex < questions.length) {
    return {
      ...questions[session.currentQuestionIndex],
      isStepIntro: false
    };
  }
  
  return null;
}

/**
 * 診断が完了しているかチェック
 * @param {Object} session - ユーザーセッション
 * @returns {boolean} - 診断が完了している場合はtrue
 */
function isDiagnosticCompleted(session) {
  return session.currentStep === questionTemplate.DIAGNOSTIC_STEPS.COMPLETED;
}

/**
 * 診断結果を保存する
 * @param {Object} session - ユーザーセッション
 * @param {Object} results - 診断結果
 * @returns {Object} - 更新されたセッション
 */
function saveResults(session, results) {
  session.results = results;
  updateUserSession(session);
  return session;
}

module.exports = {
  getUserSession,
  updateUserSession,
  deleteUserSession,
  initializeSession,
  moveToNextQuestion,
  getCurrentQuestion,
  isDiagnosticCompleted,
  saveResults
}; 