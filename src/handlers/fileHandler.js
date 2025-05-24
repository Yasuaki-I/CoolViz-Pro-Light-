const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const openaiService = require('../services/openaiService');

/**
 * LINEから画像メッセージを処理する関数
 */
async function handleImageMessage(event, client) {
  try {
    // 画像のバイナリデータを取得
    const stream = await client.getMessageContent(event.message.id);
    
    // 一時保存用のディレクトリとファイル名
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const imagePath = path.join(uploadDir, `${event.message.id}.jpg`);
    
    // 画像を保存
    const writeStream = fs.createWriteStream(imagePath);
    await new Promise((resolve, reject) => {
      stream.pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
    
    // 画像分析
    client.replyMessage(event.replyToken, {
      type: 'text',
      text: '画像を分析中です、少々お待ちください...'
    });
    
    // 画像分析（VisionAPIを使用）
    const analysisResult = await openaiService.analyzeImage(imagePath);
    
    // 画像の分析結果をユーザーに返信（別メッセージで送信）
    setTimeout(async () => {
      try {
        await client.pushMessage(event.source.userId, {
          type: 'text',
          text: `【画像分析結果】\n\n${analysisResult}\n\n※画像は自動的に削除されました。`
        });
      } catch (pushError) {
        console.error('プッシュメッセージエラー:', pushError);
      }
    }, 1000);
    
    return;
  } catch (error) {
    console.error('画像処理エラー:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '画像の処理中にエラーが発生しました。もう一度お試しください。'
    });
  }
}

/**
 * ファイルメッセージを処理する関数
 */
async function handleFileMessage(event, client) {
  try {
    // ファイルのメタデータを取得
    const fileName = event.message.fileName;
    const fileSize = event.message.fileSize;
    
    // サイズチェック（例: 10MB以上は拒否）
    if (fileSize > 10 * 1024 * 1024) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '申し訳ありませんが、10MB以上のファイルは処理できません。'
      });
    }
    
    // 対応しているファイル形式をチェック（例: テキスト、PDF、画像のみ）
    const allowedExtensions = ['.txt', '.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(fileName).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `申し訳ありませんが、${fileExtension}形式のファイルは対応していません。テキスト、PDF、または画像ファイルを送信してください。`
      });
    }
    
    // ファイルのバイナリデータを取得
    const stream = await client.getMessageContent(event.message.id);
    
    // 一時保存用のディレクトリとファイル名
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, fileName);
    
    // ファイルを保存
    const writeStream = fs.createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      stream.pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
    
    // ファイルタイプに応じた処理
    if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
      // 画像ファイルの場合
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: '画像を分析中です、少々お待ちください...'
      });
      
      // 画像分析
      const analysisResult = await openaiService.analyzeImage(filePath);
      
      // 分析結果をプッシュ通知で送信
      setTimeout(async () => {
        try {
          await client.pushMessage(event.source.userId, {
            type: 'text',
            text: `【画像分析結果】\n\n${analysisResult}\n\n※画像は自動的に削除されました。`
          });
        } catch (pushError) {
          console.error('プッシュメッセージエラー:', pushError);
        }
      }, 1000);
      
      return;
    } else {
      // テキストファイルやPDFの場合（現在は単純な受け取り確認のみ）
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `ファイル「${fileName}」を受け取りました！\nファイルサイズ: ${(fileSize / 1024).toFixed(2)}KB\n\n※テキストファイル・PDFの分析機能は現在開発中です。もうしばらくお待ちください。`
      });
    }
  } catch (error) {
    console.error('ファイル処理エラー:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ファイルの処理中にエラーが発生しました。もう一度お試しください。'
    });
  }
}

module.exports = {
  handleImageMessage,
  handleFileMessage
}; 