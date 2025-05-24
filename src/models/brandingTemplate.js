/**
 * ブランディングテンプレート
 * 業種×ジャンルに応じたテンプレート定義
 */

// 業種の定義
const INDUSTRY_TYPES = {
  HEALTH: 'ヘルス',
  DELIVERY: 'デリヘル',
  SOAP: 'ソープ',
  HOTEL: 'ホテヘル',
  ESTHE: 'エステ・アロマ'
};

// ジャンルの定義
const GENRE_TYPES = {
  GAKUEN: '学園系',
  HITOZUMA: '人妻系',
  SM: 'SM系',
  HIGHCLASS: '高級',
  FETISH: 'フェチ系',
  POCCHARI: 'ぽっちゃり',
  COSPLAY: 'コスプレ',
  KOREAN: '韓国・アジアン',
  TEKOKI: '手コキ・オナクラ',
  JUKUJO: '熟女',
  MSEIBI: 'M性感',
  BLONDE: '金髪・外国人',
  IMEKURA: 'イメクラ',
  STANDARD: 'スタンダード',
  YASUI: '激安'
};

// 文体スタイルの定義
const TEXT_STYLES = {
  SWEET: '甘え系',
  SISTER: 'お姉さん系',
  GAL: 'ギャル系',
  POLITE: '丁寧敬語系',
  NATURAL: 'ナチュラル系'
};

// テンプレートの定義
const TEMPLATES = [
  {
    id: 'template_health_gakuen',
    industry: INDUSTRY_TYPES.HEALTH,
    genre: GENRE_TYPES.GAKUEN,
    characterTone: TEXT_STYLES.SWEET,
    description: '甘えん坊・妹系・ちょっと天然',
    layout: {
      areas: {
        image: { x: 0, y: 0, width: 728, height: 90 },
        catchCopy: { x: 20, y: 20, width: 400, height: 30 },
        bodyCopy: { x: 20, y: 60, width: 400, height: 20 },
        ctaButton: { x: 600, y: 30, width: 100, height: 30 }
      },
      defaultSettings: {
        backgroundColor: '#ffffff',
        textColor: '#ff69b4',
        buttonColor: '#ff1493',
        fontFamily: 'Noto Sans JP',
        fontSize: 24,
        imageOpacity: 0.8
      }
    },
    catchphrases: [
      'ドジっ子ですが、一生懸命がんばりますっ♡',
      '先生…わたし、今日もおそばにいたいの',
      'ほんのちょっとだけ甘やかしてください…♡'
    ],
    prStructure: {
      intro: '初々しさ・緊張感を表現',
      personality: '純粋さ・天然さを強調',
      hobby: '可愛らしい趣味を前面に',
      service: '一生懸命な姿勢をアピール'
    },
    imagePrompt: 'a cute japanese girl in a school uniform, soft smile, pastel colors, sitting in cafe, anime-style, warm and innocent'
  },
  {
    id: 'template_hotel_sm',
    industry: INDUSTRY_TYPES.HOTEL,
    genre: GENRE_TYPES.SM,
    characterTone: TEXT_STYLES.SISTER,
    description: '女王様・支配的・高圧的',
    layout: {
      areas: {
        image: { x: 0, y: 0, width: 728, height: 90 },
        catchCopy: { x: 20, y: 20, width: 400, height: 30 },
        bodyCopy: { x: 20, y: 60, width: 400, height: 20 },
        ctaButton: { x: 600, y: 30, width: 100, height: 30 }
      },
      defaultSettings: {
        backgroundColor: '#000000',
        textColor: '#ffffff',
        buttonColor: '#ff0000',
        fontFamily: 'Noto Serif JP',
        fontSize: 24,
        imageOpacity: 0.7
      }
    },
    catchphrases: [
      '膝をついて、名前を呼んでみなさい',
      'しつけの時間よ。覚悟はできてる？',
      'ご褒美が欲しいの？'
    ],
    prStructure: {
      intro: '威厳と色気を表現',
      personality: 'S性と支配欲を強調',
      hobby: '非日常的な趣味に言及',
      service: '主導権を握る姿勢をアピール'
    },
    imagePrompt: 'japanese dominatrix woman, black leather outfit, confident look, red light background, mysterious and seductive'
  },
  {
    id: 'template_delivery_highclass',
    industry: INDUSTRY_TYPES.DELIVERY,
    genre: GENRE_TYPES.HIGHCLASS,
    characterTone: TEXT_STYLES.POLITE,
    description: '大人の余裕・丁寧・知的',
    layout: {
      areas: {
        image: { x: 0, y: 0, width: 728, height: 90 },
        catchCopy: { x: 20, y: 20, width: 400, height: 30 },
        bodyCopy: { x: 20, y: 60, width: 400, height: 20 },
        ctaButton: { x: 600, y: 30, width: 100, height: 30 }
      },
      defaultSettings: {
        backgroundColor: '#2c3e50',
        textColor: '#ffffff',
        buttonColor: '#e74c3c',
        fontFamily: 'Noto Serif JP',
        fontSize: 24,
        imageOpacity: 0.6
      }
    },
    catchphrases: [
      '触れたら壊れそう。でも、その先が知りたくなる',
      '品のある色香、手のひらの中に',
      '微笑みの奥に、秘密がひとつ'
    ],
    prStructure: {
      intro: '落ち着きと品格を表現',
      personality: '知的さと大人の余裕を強調',
      hobby: '洗練された趣味に言及',
      service: '丁寧なサービスをアピール'
    },
    imagePrompt: 'elegant japanese woman in a silk blouse, soft lighting, luxury mood, looking calm and mysterious'
  },
  {
    id: 'template_soap_hitozuma',
    industry: INDUSTRY_TYPES.SOAP,
    genre: GENRE_TYPES.HITOZUMA,
    characterTone: TEXT_STYLES.NATURAL,
    description: '包容力・家庭感・癒し',
    layout: {
      areas: {
        image: { x: 0, y: 0, width: 728, height: 90 },
        catchCopy: { x: 20, y: 20, width: 400, height: 30 },
        bodyCopy: { x: 20, y: 60, width: 400, height: 20 },
        ctaButton: { x: 600, y: 30, width: 100, height: 30 }
      },
      defaultSettings: {
        backgroundColor: '#f5f5f5',
        textColor: '#333333',
        buttonColor: '#007bff',
        fontFamily: 'Noto Sans JP',
        fontSize: 24,
        imageOpacity: 0.9
      }
    },
    catchphrases: [
      '今日だけは、あなただけの奥さんになりたい',
      '優しさに包まれたい夜は、わたしの胸の中へ',
      '大人の色気は、経験が育てるもの'
    ],
    prStructure: {
      intro: '包容力と温かさを表現',
      personality: '優しさと母性を強調',
      hobby: '家庭的な趣味に言及',
      service: '癒しと安らぎをアピール'
    },
    imagePrompt: 'mature japanese woman with gentle smile, elegant but casual attire, warm lighting, domestic setting, comforting and nurturing aura'
  },
  {
    id: 'template_esthe_shucchou',
    industry: INDUSTRY_TYPES.ESTHE,
    genre: GENRE_TYPES.STANDARD,
    characterTone: TEXT_STYLES.POLITE,
    description: 'リラクゼーション・距離感・技術重視',
    layout: {
      areas: {
        image: { x: 0, y: 0, width: 728, height: 90 },
        catchCopy: { x: 20, y: 20, width: 400, height: 30 },
        bodyCopy: { x: 20, y: 60, width: 400, height: 20 },
        ctaButton: { x: 600, y: 30, width: 100, height: 30 }
      },
      defaultSettings: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        buttonColor: '#000000',
        fontFamily: 'Noto Sans JP',
        fontSize: 24,
        imageOpacity: 0.8
      }
    },
    catchphrases: [
      '心と体、どちらも満たしたいあなたへ',
      '手のぬくもりが、あなたの疲れを解きほぐす',
      '特別な時間、特別なケアを'
    ],
    prStructure: {
      intro: 'プロフェッショナルな印象を表現',
      personality: '誠実さと技術力を強調',
      hobby: '健康的な趣味に言及',
      service: '安心感と技術をアピール'
    },
    imagePrompt: 'professional japanese masseuse in elegant uniform, calm expression, clean spa setting, healing atmosphere, warm but professional demeanor'
  }
];

/**
 * 業種とジャンルに最適なテンプレートを取得する
 * @param {string} industry - 業種
 * @param {string} genre - ジャンル
 * @param {string} textStyle - 希望する文体スタイル
 * @returns {Object} - テンプレートオブジェクト
 */
function getTemplate(industry, genre, textStyle) {
  // 完全一致するテンプレートを検索
  let template = TEMPLATES.find(t => 
    t.industry === industry && 
    t.genre === genre && 
    (textStyle ? t.characterTone === textStyle : true)
  );
  
  // 完全一致がない場合、業種だけ一致するテンプレートを検索
  if (!template) {
    template = TEMPLATES.find(t => 
      t.industry === industry && 
      (textStyle ? t.characterTone === textStyle : true)
    );
  }
  
  // 業種も一致しない場合、ジャンルだけ一致するテンプレートを検索
  if (!template) {
    template = TEMPLATES.find(t => 
      t.genre === genre && 
      (textStyle ? t.characterTone === textStyle : true)
    );
  }
  
  // どれも一致しない場合、スタンダードテンプレートを返す
  if (!template) {
    template = TEMPLATES.find(t => 
      t.id === 'template_delivery_highclass'
    );
  }
  
  return template;
}

/**
 * 文体スタイルに基づく文章構成を取得する
 * @param {string} textStyle - 文体スタイル
 * @returns {Object} - 文体パターン
 */
function getTextStylePattern(textStyle) {
  const patterns = {
    [TEXT_STYLES.SWEET]: {
      firstPerson: 'あたし',
      clientTerm: 'お兄さん',
      endingSentence: ['だよ♡', 'ね♡', 'かな？'],
      emoji: ['♡', '💕', '✨'],
      example: 'きょうは16:00〜出勤だよぉ♡ ギューしに来てくれる？ 待ってるねっ！'
    },
    [TEXT_STYLES.SISTER]: {
      firstPerson: '私',
      clientTerm: 'あなた',
      endingSentence: ['わ', 'わね', 'かしら'],
      emoji: ['♪', '💋', '🍷'],
      example: '本日16時より出勤いたします。よろしければ、癒しに来てくださいね。'
    },
    [TEXT_STYLES.GAL]: {
      firstPerson: 'あたし',
      clientTerm: 'くん',
      endingSentence: ['やん', 'よー！', 'じゃん'],
      emoji: ['💓', '😘', '👑'],
      example: '16じからいるょー！マジで寂しい〜！あそんでくれる人きてッ♡'
    },
    [TEXT_STYLES.POLITE]: {
      firstPerson: '私',
      clientTerm: 'お客様',
      endingSentence: ['です', 'ます', 'でしょうか'],
      emoji: ['🌸', '✨', '☺️'],
      example: '本日16時から出勤します。お時間合えば、ぜひお会いできたら嬉しいです。'
    },
    [TEXT_STYLES.NATURAL]: {
      firstPerson: '私',
      clientTerm: '',
      endingSentence: ['かな', 'よ', 'ね'],
      emoji: ['✨', '💭', '☺️'],
      example: '今日16時からいます〜。なんとなく会いたいな〜って気分だったり…？'
    }
  };
  
  return patterns[textStyle] || patterns[TEXT_STYLES.NATURAL];
}

module.exports = {
  INDUSTRY_TYPES,
  GENRE_TYPES,
  TEXT_STYLES,
  TEMPLATES,
  getTemplate,
  getTextStylePattern
}; 