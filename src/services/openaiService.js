const openai = require('../../config/openai');
const brandingTemplate = require('../models/brandingTemplate');

/**
 * OpenAI APIを使用してブランディング診断結果を生成する
 * @param {Object} answers - ユーザーの回答
 * @returns {Object} - 生成されたブランディング結果
 */
async function generateBrandingResults(answers) {
  try {
    // テンプレートの取得
    const template = brandingTemplate.getTemplate(
      answers.industry,
      answers.genre,
      answers.text_style
    );
    
    // 文体スタイルの取得
    const textStyle = brandingTemplate.getTextStylePattern(
      template.characterTone
    );
    
    // プロンプトの作成
    const prompt = `
あなたは風俗業界で働く女性向けのブランディングアドバイザー「Myブランディングちゃん【光杏】」です。
以下の回答内容に基づいて、キャストさんの魅力が最大限に伝わるブランディング案を生成してください。

【回答内容】
・名前: ${answers.name || '未入力'}
・年齢: ${answers.age || '未入力'}
・性格・第一印象: ${answers.personality || '未入力'}
・趣味・好きなこと: ${answers.hobby || '未入力'}
・得意なこと: ${answers.goodat || '未入力'}
・見た目の特徴・売りポイント: ${answers.feature || '未入力'}
・好きなファッション: ${answers.fashion || '未入力'}
・接客スタイル・得意プレイ: ${answers.style || '未入力'}
・大切にしている雰囲気: ${answers.atmosphere || '未入力'}
・指名客の傾向: ${answers.client_type || '未入力'}
・理想のお客様像: ${answers.ideal_client || '未入力'}
・業種: ${answers.industry || '未入力'}
・ジャンル: ${answers.genre || '未入力'}
・文体の希望: ${answers.text_style || '未入力'}

【テンプレート情報】
・テンプレートID: ${template.id}
・キャラクタートーン: ${template.description}
・文体スタイル: ${template.characterTone}

以下の項目を生成してください：
1. キャッチコピー（3案）
2. 自己PR文（2〜4文）
3. SNS投稿の方向性アドバイス
4. あなたのイメージに合う画像生成用プロンプト（英語）

文体スタイルは「${template.characterTone}」を基本とし、以下の特徴を持たせてください：
・一人称: ${textStyle.firstPerson}
・お客様の呼び方: ${textStyle.clientTerm}
・文末表現: ${textStyle.endingSentence.join('、')}
・絵文字の使い方: ${textStyle.emoji.join('、')}

【各項目の出力形式】
・キャッチコピー: 3案を箇条書きで
・自己PR文: 2〜4文の連続した文章で
・SNS投稿アドバイス: 200字程度の具体的なアドバイス
・画像プロンプト: 英語で100〜150語程度

【出力ルール】
・性的表現は控えめに、かつポジティブな表現を心がけてください
・テンプレートのキャラクタートーンを生かしつつ、回答内容を反映させてください
・各ジャンルの特性（学園系なら初々しさ、高級店なら品格など）を表現に取り入れてください
`;

    // OpenAI API呼び出し
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "あなたは風俗業界で働く女性向けのブランディングアドバイザー「Myブランディングちゃん【光杏】」です。親しみやすく、明るい口調で回答してください。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    
    // 結果をパースする処理
    const catchphrasesMatch = content.match(/キャッチコピー[：:]([\s\S]*?)(?=自己PR文|$)/i);
    const prTextMatch = content.match(/自己PR文[：:]([\s\S]*?)(?=SNS投稿|$)/i);
    const snsAdviceMatch = content.match(/SNS投稿[^\n]*?[：:]([\s\S]*?)(?=画像生成|$)/i);
    const imagePromptMatch = content.match(/画像生成[^\n]*?[：:]([\s\S]*?)$/i);
    
    // 結果を抽出して整形
    const catchphrases = catchphrasesMatch ? 
      catchphrasesMatch[1].split(/\d+[\.．、]|\-|\*|\・/).filter(Boolean).map(text => text.trim()) : 
      template.catchphrases;
    
    const prText = prTextMatch ? 
      prTextMatch[1].trim() : 
      '優しさと甘えたムードがミックスした、癒し系キャスト。笑顔と会話で心も体もリラックスさせることが得意です。一緒にいるだけで心が軽くなる、そんな特別な時間をご提供します♪';
    
    const snsAdvice = snsAdviceMatch ? 
      snsAdviceMatch[1].trim() : 
      '日常の何気ないひとコマを投稿すると親近感が湧きます。カフェでのひと息や、趣味の時間など、あなたの素の表情が伝わる写真とともに、軽やかな文章で投稿するのがおすすめです。ハッシュタグは #癒し系 #甘えんぼ などのキーワードを使うと効果的です。';
    
    const imagePrompt = imagePromptMatch ? 
      imagePromptMatch[1].trim() : 
      template.imagePrompt;
    
    return {
      catchphrases,
      prText,
      snsAdvice,
      imagePrompt,
      template: {
        id: template.id,
        description: template.description,
        characterTone: template.characterTone
      },
      textStyle: {
        type: template.characterTone,
        firstPerson: textStyle.firstPerson,
        clientTerm: textStyle.clientTerm,
        example: textStyle.example
      }
    };
  } catch (error) {
    console.error('OpenAI APIでのエラー:', error);
    throw error;
  }
}

/**
 * 文体を変更して再度生成する
 * @param {Object} results - 前回の生成結果
 * @param {string} newTextStyle - 新しい文体スタイル
 * @param {Object} answers - ユーザーの回答
 * @returns {Object} - 新しい生成結果
 */
async function regenerateWithNewStyle(results, newTextStyle, answers) {
  try {
    // 新しい文体スタイルで回答を更新
    const updatedAnswers = {
      ...answers,
      text_style: newTextStyle
    };
    
    // 再度生成
    return await generateBrandingResults(updatedAnswers);
  } catch (error) {
    console.error('文体変更時のエラー:', error);
    throw error;
  }
}

/**
 * 写メ日記の文体を分析する
 * @param {string} diaryText - 分析する日記テキスト
 * @returns {string} - 分析結果
 */
async function analyzeDiaryStyle(diaryText) {
  try {
    if (!diaryText || diaryText.length < 10) {
      return '分析するためには、もう少し長い文章が必要です。写メ日記の内容を送ってください。';
    }
    
    const prompt = `
以下の写メ日記の文体を分析してください：

"${diaryText}"

以下の項目について分析してください：
1. 一人称（あたし／私／名前呼びなど）
2. お客様の呼び方（お兄様／イニシャルなど）
3. よく使う絵文字
4. 文体の印象（甘え系／砕けた口調／敬語など）
5. 【総合】どの文体スタイルに最も近いか（甘え系／お姉さん系／ギャル系／丁寧敬語系／ナチュラル系）
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "あなたは風俗業界で働く女性向けの文体分析アドバイザーです。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('文体分析でのエラー:', error);
    return 'すみません、分析中にエラーが発生しました。もう一度お試しください。';
  }
}

/**
 * 画像を分析する
 * @param {string} imagePath - 画像ファイルのパス
 * @returns {string} - 分析結果
 */
async function analyzeImage(imagePath) {
  try {
    // 画像をBase64エンコード
    const fs = require('fs');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // OpenAI Vision APIを呼び出す
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたは風俗業界で働く女性向けのブランディングアドバイザーです。アップロードされた画像を分析して、SNSや写メ日記での活用方法についてアドバイスしてください。露出度が高い画像の場合は、プライバシーに配慮したアドバイスを心がけてください。"
        },
        {
          role: "user",
          content: [
            { type: "text", text: "この画像をSNSや写メ日記で活用するためのアドバイスをください。" },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });
    
    // 使用後は一時ファイルを削除
    fs.unlinkSync(imagePath);
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('画像分析エラー:', error);
    return 'すみません、画像の分析中にエラーが発生しました。もう一度お試しください。';
  }
}

module.exports = {
  generateBrandingResults,
  regenerateWithNewStyle,
  analyzeDiaryStyle,
  analyzeImage
}; 