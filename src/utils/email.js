const nodemailer = require('nodemailer');
const { logger } = require('./logger');

// メール送信用の設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// メール送信の検証
const verifyConnection = async () => {
  try {
    await transporter.verify();
    logger.info('SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error('SMTP connection verification failed', { error });
    return false;
  }
};

// パスワードリセットメールの送信
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: `"Myブランディング" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'パスワードリセットのご案内',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">パスワードリセットのご案内</h2>
        <p>パスワードリセットのリクエストを受け付けました。</p>
        <p>以下のリンクをクリックして、新しいパスワードを設定してください：</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            パスワードをリセット
          </a>
        </p>
        <p>このリンクは1時間後に期限切れとなります。</p>
        <p>もしパスワードリセットをリクエストしていない場合は、このメールを無視してください。</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          このメールは自動送信されています。返信はできませんのでご注意ください。
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent successfully', { email });
    return true;
  } catch (error) {
    logger.error('Failed to send password reset email', { error, email });
    throw error;
  }
};

// パスワード変更完了メールの送信
const sendPasswordChangedEmail = async (email) => {
  const mailOptions = {
    from: `"Myブランディング" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'パスワード変更完了のお知らせ',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">パスワード変更完了</h2>
        <p>パスワードの変更が完了しました。</p>
        <p>もし心当たりのない変更があった場合は、すぐにサポートまでご連絡ください。</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          このメールは自動送信されています。返信はできませんのでご注意ください。
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Password changed notification email sent successfully', { email });
    return true;
  } catch (error) {
    logger.error('Failed to send password changed notification email', { error, email });
    throw error;
  }
};

module.exports = {
  verifyConnection,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
}; 