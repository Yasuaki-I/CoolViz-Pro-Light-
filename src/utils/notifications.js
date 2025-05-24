const { WebClient } = require('@slack/web-api');
const nodemailer = require('nodemailer');
const logger = require('./logger');

// Slack設定
const slack = new WebClient(process.env.SLACK_TOKEN);
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || '#monitoring';

// メール設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// 通知の重要度に応じた設定
const SEVERITY_CONFIG = {
  critical: {
    slackColor: '#FF0000',
    emailSubject: '🚨 CRITICAL ALERT',
    retryCount: 3
  },
  warning: {
    slackColor: '#FFA500',
    emailSubject: '⚠️ WARNING ALERT',
    retryCount: 2
  },
  info: {
    slackColor: '#00FF00',
    emailSubject: 'ℹ️ INFO ALERT',
    retryCount: 1
  }
};

// Slack通知送信
async function sendSlackNotification(message, severity = 'warning') {
  const config = SEVERITY_CONFIG[severity];
  let retries = 0;

  while (retries < config.retryCount) {
    try {
      await slack.chat.postMessage({
        channel: SLACK_CHANNEL,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${severity.toUpperCase()} Alert*\n${message}`
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `*Time:* ${new Date().toISOString()}`
              }
            ]
          }
        ]
      });

      logger.info(`Slack notification sent: ${message}`);
      return true;
    } catch (error) {
      retries++;
      logger.error(`Failed to send Slack notification (attempt ${retries}/${config.retryCount}):`, error);
      if (retries === config.retryCount) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
}

// メール通知送信
async function sendEmailNotification(message, severity = 'warning') {
  const config = SEVERITY_CONFIG[severity];
  let retries = 0;

  while (retries < config.retryCount) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.ALERT_EMAIL_RECIPIENTS,
        subject: config.emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: ${config.slackColor};">${severity.toUpperCase()} Alert</h2>
            <p>${message}</p>
            <hr>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>
        `
      });

      logger.info(`Email notification sent: ${message}`);
      return true;
    } catch (error) {
      retries++;
      logger.error(`Failed to send email notification (attempt ${retries}/${config.retryCount}):`, error);
      if (retries === config.retryCount) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
}

// 通知送信（Slackとメールの両方）
async function sendNotification(message, severity = 'warning') {
  const slackSuccess = await sendSlackNotification(message, severity);
  
  // Slackが失敗した場合、メールで通知
  if (!slackSuccess) {
    await sendEmailNotification(message, severity);
  }
}

module.exports = {
  sendNotification,
  sendSlackNotification,
  sendEmailNotification
}; 