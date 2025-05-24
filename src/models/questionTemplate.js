/**
 * 質問テンプレート
 * 自己分析のための質問構成を定義
 */

// 質問セクションの定義
const QUESTION_SECTIONS = {
  BASIC: 'basic',          // 基本情報
  PERSONALITY: 'personality', // 性格・人柄
  APPEARANCE: 'appearance',   // 見た目・特徴
  SERVICE: 'service',        // 接客スタイル・得意なこと
  CLIENT: 'client',         // お客様の傾向
  BRANDING: 'branding'       // ブランディング方向性
};

// 各セクションの質問項目
const QUESTIONS = {
  [QUESTION_SECTIONS.BASIC]: [
    {
      id: 'name',
      text: 'あなたのお名前（源氏名）を教えてください',
      example: '例：「ゆうな」「あやか」など',
      required: true
    },
    {
      id: 'age',
      text: 'おいくつですか？',
      example: '例：20代前半、25歳など',
      required: true
    },
    {
      id: 'body',
      text: '身長・スリーサイズなど、見た目の特徴を教えてください',
      example: '例：158cm・Eカップ・スレンダー など',
      required: false
    }
  ],
  [QUESTION_SECTIONS.PERSONALITY]: [
    {
      id: 'personality',
      text: 'あなたの性格や第一印象を教えてください',
      example: '例：明るい、おっとり、人見知り、社交的 など',
      required: true
    },
    {
      id: 'hobby',
      text: '趣味や好きなことは何ですか？',
      example: '例：カフェ巡り、アニメ鑑賞、お酒を飲むこと、音楽を聴くこと など',
      required: true
    },
    {
      id: 'goodat',
      text: '得意なことや自信のあることはありますか？',
      example: '例：料理が得意、マッサージが上手、話を聞くのが得意 など',
      required: false
    }
  ],
  [QUESTION_SECTIONS.APPEARANCE]: [
    {
      id: 'feature',
      text: 'あなたの見た目の特徴や売りポイントを教えてください',
      example: '例：清楚な雰囲気、ギャップがある、Iカップ、美脚 など',
      required: true
    },
    {
      id: 'fashion',
      text: '好きなファッションや普段のコーディネートを教えてください',
      example: '例：ガーリー系、シンプル、カジュアル など',
      required: false
    }
  ],
  [QUESTION_SECTIONS.SERVICE]: [
    {
      id: 'style',
      text: 'あなたの接客スタイルや得意なことは？',
      example: '例：添い寝が好き、イチャイチャ重視、会話を大切にしている など',
      required: true
    },
    {
      id: 'atmosphere',
      text: 'お客様との時間の中で、どんな雰囲気を大切にしていますか？',
      example: '例：リラックスできる時間、楽しい会話、癒しの空間 など',
      required: false
    }
  ],
  [QUESTION_SECTIONS.CLIENT]: [
    {
      id: 'client_type',
      text: 'あなたを指名してくれるお客様の傾向はどんな感じですか？',
      example: '例：M気質な方、会話好きな方、優しい方 など',
      required: true
    },
    {
      id: 'ideal_client',
      text: 'あなたの理想のお客様像を教えてください',
      example: '例：甘やかしてくれる方、趣味が合う方、リードしてくれる方 など',
      required: true
    }
  ],
  [QUESTION_SECTIONS.BRANDING]: [
    {
      id: 'industry',
      text: 'あなたの業種は何ですか？',
      example: '例：ヘルス、デリヘル、ソープ、ホテヘル、エステ・アロマ など',
      required: true
    },
    {
      id: 'genre',
      text: 'お店のジャンルや特徴はありますか？',
      example: '例：学園系、人妻系、高級店、SM系 など',
      required: true
    },
    {
      id: 'text_style',
      text: '希望する文体やSNSスタイルについて何かこだわりはありますか？',
      example: '例：甘えた口調がいい、クールな感じで、丁寧な言葉遣いで など',
      required: false
    }
  ]
};

// 診断ステップの定義
const DIAGNOSTIC_STEPS = {
  START: 'start',           // 診断開始
  BASIC_INFO: 'basic_info',     // 基本情報入力
  PERSONALITY: 'personality',    // 性格・人柄
  APPEARANCE: 'appearance',     // 見た目・特徴
  SERVICE_STYLE: 'service_style',  // 接客スタイル
  CLIENT_TYPE: 'client_type',    // お客様の傾向
  BRANDING: 'branding',       // ブランディング方向性
  COMPLETED: 'completed'       // 診断完了
};

// ステップに対応する質問テキスト
const STEP_QUESTIONS = {
  [DIAGNOSTIC_STEPS.START]: 'ブランディング診断を開始します！あなたのことをもっと知りたいな♪',
  [DIAGNOSTIC_STEPS.BASIC_INFO]: '【基本情報】\nまずは基本的なことを教えてください！',
  [DIAGNOSTIC_STEPS.PERSONALITY]: '【あなたらしさ】\nあなたの性格や好きなことについて教えてください！',
  [DIAGNOSTIC_STEPS.APPEARANCE]: '【見た目・特徴】\nあなたの見た目の特徴について教えてください！',
  [DIAGNOSTIC_STEPS.SERVICE_STYLE]: '【接客スタイル】\nあなたの接客スタイルや得意なことは？',
  [DIAGNOSTIC_STEPS.CLIENT_TYPE]: '【お客様について】\nどんなお客様が多いですか？理想のお客様像も教えてください！',
  [DIAGNOSTIC_STEPS.BRANDING]: '【ブランディング方向性】\n最後に、ブランディングの方向性について教えてください！',
  [DIAGNOSTIC_STEPS.COMPLETED]: '全ての質問にお答えいただきありがとうございます！\n結果を生成中です...'
};

/**
 * セクションIDに対応する質問リストを取得する
 * @param {string} sectionId - セクションID
 * @returns {Array} - 質問リスト
 */
function getQuestionsBySection(sectionId) {
  return QUESTIONS[sectionId] || [];
}

/**
 * 診断ステップに対応するセクションIDを取得する
 * @param {string} step - 診断ステップ
 * @returns {string} - セクションID
 */
function getSectionByStep(step) {
  const mapping = {
    [DIAGNOSTIC_STEPS.BASIC_INFO]: QUESTION_SECTIONS.BASIC,
    [DIAGNOSTIC_STEPS.PERSONALITY]: QUESTION_SECTIONS.PERSONALITY,
    [DIAGNOSTIC_STEPS.APPEARANCE]: QUESTION_SECTIONS.APPEARANCE,
    [DIAGNOSTIC_STEPS.SERVICE_STYLE]: QUESTION_SECTIONS.SERVICE,
    [DIAGNOSTIC_STEPS.CLIENT_TYPE]: QUESTION_SECTIONS.CLIENT,
    [DIAGNOSTIC_STEPS.BRANDING]: QUESTION_SECTIONS.BRANDING
  };
  
  return mapping[step] || null;
}

/**
 * 次の診断ステップを取得する
 * @param {string} currentStep - 現在のステップ
 * @returns {string} - 次のステップ
 */
function getNextStep(currentStep) {
  const stepOrder = [
    DIAGNOSTIC_STEPS.START,
    DIAGNOSTIC_STEPS.BASIC_INFO,
    DIAGNOSTIC_STEPS.PERSONALITY,
    DIAGNOSTIC_STEPS.APPEARANCE,
    DIAGNOSTIC_STEPS.SERVICE_STYLE,
    DIAGNOSTIC_STEPS.CLIENT_TYPE,
    DIAGNOSTIC_STEPS.BRANDING,
    DIAGNOSTIC_STEPS.COMPLETED
  ];
  
  const currentIndex = stepOrder.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
    return DIAGNOSTIC_STEPS.COMPLETED;
  }
  
  return stepOrder[currentIndex + 1];
}

module.exports = {
  QUESTION_SECTIONS,
  QUESTIONS,
  DIAGNOSTIC_STEPS,
  STEP_QUESTIONS,
  getQuestionsBySection,
  getSectionByStep,
  getNextStep
}; 