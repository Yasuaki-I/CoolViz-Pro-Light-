const sessionService = require('../services/sessionService');
const openaiService = require('../services/openaiService');
const questionTemplate = require('../models/questionTemplate');

// 診断ステップの定義
const DIAGNOSTIC_STEPS = {
  START: 'start',
  Q1_HOBBIES: 'q1_hobbies',
  Q2_APPEARANCE: 'q2_appearance',
  Q3_SERVICE_STYLE: 'q3_service_style',
  Q4_CLIENT_TYPE: 'q4_client_type',
  Q5_IDEAL_CLIENT: 'q5_ideal_client',
  Q6_OPTIONAL: 'q6_optional',
  COMPLETED: 'completed'
};

// ステップに対応する質問テキスト
const STEP_QUESTIONS = {
  [DIAGNOSTIC_STEPS.START]: 'ブランディング診断を開始します！あなたのことをもっと知りたいな♪\n\n【質問1】\nまずは趣味や好きなことを教えてください！\n例：カフェ巡り、アニメ鑑賞、お酒を飲むこと、など',
  [DIAGNOSTIC_STEPS.Q1_HOBBIES]: '【質問2】\nあなたの見た目の特徴や売りポイントを教えてください！\n例：清楚な雰囲気、ギャップがある、Iカップ、など',
  [DIAGNOSTIC_STEPS.Q2_APPEARANCE]: '【質問3】\nあなたの接客スタイルや得意なことは？\n例：添い寝が好き、イチャイチャ重視、会話を大切にしている、など',
  [DIAGNOSTIC_STEPS.Q3_SERVICE_STYLE]: '【質問4】\nあなたを指名してくれるお客様の傾向はどんな感じですか？\n例：M気質な方、会話好きな方、優しい方、など',
  [DIAGNOSTIC_STEPS.Q4_CLIENT_TYPE]: '【質問5】\nあなたの理想のお客様像を教えてください！\n例：甘やかしてくれる方、趣味が合う方、リードしてくれる方、など',
  [DIAGNOSTIC_STEPS.Q5_IDEAL_CLIENT]: '【質問6】（任意）\n希望する文体やSNSスタイルについて何かこだわりはありますか？\n例：甘えた口調がいい、クールな感じで、など\n※なければ「なし」と入力してください',
  [DIAGNOSTIC_STEPS.Q6_OPTIONAL]: '全ての質問にお答えいただきありがとうございます！\n結果を生成中です...',
  [DIAGNOSTIC_STEPS.COMPLETED]: '診断が完了しました！\n以下のメニューから確認したい情報を選んでください：\n\n1. キャッチコピー\n2. 自己PR文\n3. SNS投稿アドバイス\n4. 写メ日記文体分析\n5. 画像生成プロンプト'
};

/**
 * テキストメッセージを処理する関数
 */
async function handleTextMessage(event, client) {
  const userId = event.source.userId;
  const userMessage = event.message.text.trim();
  
  // ユーザーセッションを取得
  let session = sessionService.getUserSession(userId);
  
  // メッセージに基づいて処理を振り分け
  if (userMessage === '診断開始' || userMessage === 'スタート') {
    return startDiagnostic(event, client, userId);
  } 
  else if (session && !sessionService.isDiagnosticCompleted(session)) {
    // 診断中の場合は回答として処理
    return handleDiagnosticResponse(event, client, session, userMessage);
  }
  else if (session && sessionService.isDiagnosticCompleted(session)) {
    // 診断完了後のメニュー選択として処理
    return handleCompletedDiagnostic(event, client, session, userMessage);
  }
  else {
    // その他のメッセージは一般的な応答を返す
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'こんにちは！「診断開始」と送信すると、あなただけのブランディング診断を始めることができます♪'
    });
  }
}

/**
 * 診断を開始する関数
 */
function startDiagnostic(event, client, userId) {
  // 新しいセッションを初期化
  const session = sessionService.initializeSession(userId);
  
  // ウェルカムメッセージを送信
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'はじめまして！AIパーソナル診断ツール「Myブランディングちゃん【光杏】」です♪\n\nこれからあなたにいくつか質問をして、あなたらしさを引き出していきますね！\n\nでは、「次へ」と送信して始めましょう！'
  });
}

/**
 * 診断中の回答を処理する関数
 */
async function handleDiagnosticResponse(event, client, session, userMessage) {
  // 「次へ」というメッセージの場合はステップ紹介を表示
  if (userMessage === '次へ' && session.currentQuestionIndex === 0) {
    const question = sessionService.getCurrentQuestion(session);
    
    if (question && question.isStepIntro) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: question.text
      });
    }
  }
  
  // 現在の質問に対する回答を処理
  const currentQuestion = sessionService.getCurrentQuestion(session);
  
  // ステップ紹介の場合は次の質問に進む
  if (currentQuestion && currentQuestion.isStepIntro) {
    sessionService.moveToNextQuestion(session, '');
    const nextQuestion = sessionService.getCurrentQuestion(session);
    
    if (nextQuestion) {
      const questionText = `${nextQuestion.text}\n${nextQuestion.example || ''}`;
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: questionText
      });
    }
  } else if (currentQuestion) {
    // 通常の質問の場合は回答を保存して次の質問に進む
    sessionService.moveToNextQuestion(session, userMessage);
    
    // 次の質問（またはステップ紹介）を取得
    const nextQuestion = sessionService.getCurrentQuestion(session);
    
    if (nextQuestion) {
      // 次の質問がある場合は質問を表示
      const questionText = nextQuestion.isStepIntro
        ? nextQuestion.text
        : `${nextQuestion.text}\n${nextQuestion.example || ''}`;
      
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: questionText
      });
    } else {
      // 質問が終了した場合（診断完了）
      try {
        // 診断結果を生成
        const results = await openaiService.generateBrandingResults(session.answers);
        
        // 結果をセッションに保存
        sessionService.saveResults(session, results);
        
        // 診断完了メッセージを送信
        return client.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: 'お疲れ様でした！あなたの回答を元に、あなたにぴったりのブランディングを考えました！'
          },
          {
            type: 'text',
            text: '以下のメニューから確認したい情報を選んでください：\n\n1. キャッチコピー\n2. 自己PR文\n3. SNS投稿アドバイス\n4. 写メ日記文体分析\n5. 画像生成プロンプト\n6. 使用テンプレート情報'
          }
        ]);
      } catch (error) {
        console.error('診断結果の生成に失敗しました:', error);
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'すみません、エラーが発生しました。もう一度「診断開始」と送信してください。'
        });
      }
    }
  }
}

/**
 * 診断完了後のメニュー選択を処理する関数
 */
async function handleCompletedDiagnostic(event, client, session, userMessage) {
  // メニュー選択に基づいて処理
  switch (userMessage) {
    case '1':
    case 'キャッチコピー':
      if (session.results && session.results.catchphrases) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: `【あなたにぴったりのキャッチコピー】\n\n${session.results.catchphrases.join('\n\n')}\n\n※他のメニューも確認してみてください！`
        });
      }
      break;
      
    case '2':
    case '自己PR文':
      if (session.results && session.results.prText) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: `【あなたの魅力を伝えるPR文】\n\n${session.results.prText}\n\n※このPR文は、あなたの回答から自動生成されました。実際のプロフィールに使用する際は、適宜調整してください。`
        });
      }
      break;
      
    case '3':
    case 'SNS投稿アドバイス':
      if (session.results && session.results.snsAdvice) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: `【SNS投稿のアドバイス】\n\n${session.results.snsAdvice}\n\n※SNSの運用方法や頻度は、お店のルールに従ってください。`
        });
      }
      break;
      
    case '4':
    case '写メ日記文体分析':
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '写メ日記の分析をするには、分析したい日記のテキストを送ってください。\n\n※「日記分析：」の後に日記内容を入力することもできます。'
      });
      
    case '5':
    case '画像生成プロンプト':
      if (session.results && session.results.imagePrompt) {
        return client.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `【あなたのイメージに合った画像生成プロンプト】\n\n${session.results.imagePrompt}`
          },
          {
            type: 'text',
            text: `このプロンプトをコピーして、ImageFXやDALL-Eに貼り付けるだけで、あなたのイメージに合った画像を生成できます♪\n\n■ ImageFXの使い方\n1. https://imagefx.google.com/ にアクセス\n2. プロンプトを貼り付け\n3. 「生成」ボタンをクリック`
          }
        ]);
      }
      break;
      
    case '6':
    case 'テンプレート情報':
      if (session.results && session.results.template) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: `【使用テンプレート情報】\n\n・テンプレートID: ${session.results.template.id}\n・テンプレート説明: ${session.results.template.description}\n・文体スタイル: ${session.results.template.characterTone}\n\n【文体の特徴】\n・一人称: ${session.results.textStyle.firstPerson}\n・お客様の呼び方: ${session.results.textStyle.clientTerm}\n・例文: ${session.results.textStyle.example}`
        });
      }
      break;
    
    case '文体変更':
    case '文体を変更':
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '文体スタイルを変更できます。以下から選んでください：\n\n・甘え系\n・お姉さん系\n・ギャル系\n・丁寧敬語系\n・ナチュラル系\n\n例：「甘え系に変更」と送信してください。'
      });
      break;
      
    default:
      // 文体変更のリクエスト
      const textStyleChangeMatch = userMessage.match(/(甘え系|お姉さん系|ギャル系|丁寧敬語系|ナチュラル系)に変更/);
      if (textStyleChangeMatch) {
        const newTextStyle = textStyleChangeMatch[1];
        try {
          const newResults = await openaiService.regenerateWithNewStyle(
            session.results,
            newTextStyle,
            session.answers
          );
          
          // 新しい結果を保存
          sessionService.saveResults(session, newResults);
          
          return client.replyMessage(event.replyToken, [
            {
              type: 'text',
              text: `文体を「${newTextStyle}」に変更しました！`
            },
            {
              type: 'text',
              text: '以下のメニューから確認したい情報を選んでください：\n\n1. キャッチコピー\n2. 自己PR文\n3. SNS投稿アドバイス\n4. 写メ日記文体分析\n5. 画像生成プロンプト\n6. 使用テンプレート情報'
            }
          ]);
        } catch (error) {
          console.error('文体変更エラー:', error);
          return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '文体変更中にエラーが発生しました。もう一度お試しください。'
          });
        }
      }
      
      // 日記分析のリクエスト
      if (userMessage.startsWith('日記分析：')) {
        const diaryText = userMessage.substring('日記分析：'.length).trim();
        return analyzeDiaryStyle(event, client, diaryText);
      }
      
      // その他のメッセージにはメニューを再表示
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '以下のメニューから確認したい情報を選んでください：\n\n1. キャッチコピー\n2. 自己PR文\n3. SNS投稿アドバイス\n4. 写メ日記文体分析\n5. 画像生成プロンプト\n6. 使用テンプレート情報\n\n※「文体変更」と送信すると、文体スタイルを変更できます。\n※「診断開始」と送信すると、新しい診断を始めることができます。'
      });
  }
  
  // 結果がない場合
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'すみません、該当する情報がまだ生成されていません。「診断開始」と送信して、診断をやり直してください。'
  });
}

/**
 * 写メ日記の文体を分析する関数
 */
async function analyzeDiaryStyle(event, client, diaryText) {
  try {
    if (!diaryText || diaryText.length < 10) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '分析するためには、もう少し長い文章が必要です。写メ日記の内容を送ってください。'
      });
    }
    
    const analysisResult = await openaiService.analyzeDiaryStyle(diaryText);
    
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `【写メ日記の文体分析結果】\n\n${analysisResult}`
    });
  } catch (error) {
    console.error('文体分析でのエラー:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'すみません、分析中にエラーが発生しました。もう一度お試しください。'
    });
  }
}

module.exports = {
  handleTextMessage
}; 