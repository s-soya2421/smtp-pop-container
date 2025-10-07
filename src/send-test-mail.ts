#!/usr/bin/env tsx
/**
 * テストメール送信スクリプト（TypeScript版）
 * nodemailerを使用してSMTP経由でメールを送信
 */

import nodemailer, { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class MailSender {
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private config: MailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      // デバッグ情報を表示
      logger: true,
      debug: true,
    });
  }

  /**
   * メール送信
   */
  async send(options: MailOptions): Promise<void> {
    try {
      console.log(`\n📧 Sending email via ${this.config.host}:${this.config.port}...`);
      console.log(`From: ${options.from}`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}\n`);

      const info = await this.transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log('\n✓ Email sent successfully!');
      console.log(`Message ID: ${info.messageId}`);
      console.log(`Response: ${info.response}`);

      if (info.accepted.length > 0) {
        console.log(`Accepted: ${info.accepted.join(', ')}`);
      }
      if (info.rejected.length > 0) {
        console.log(`Rejected: ${info.rejected.join(', ')}`);
      }
    } catch (error) {
      console.error('\n✗ Error sending email:');
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
      throw error;
    }
  }

  /**
   * 接続確認
   */
  async verify(): Promise<boolean> {
    try {
      console.log(`\n🔌 Verifying connection to ${this.config.host}:${this.config.port}...`);
      await this.transporter.verify();
      console.log('✓ SMTP connection is ready\n');
      return true;
    } catch (error) {
      console.error('✗ SMTP connection failed:');
      if (error instanceof Error) {
        console.error(error.message);
      }
      return false;
    }
  }

  /**
   * 接続をクローズ
   */
  close(): void {
    this.transporter.close();
  }
}

/**
 * HTML形式のメール本文を生成
 */
function generateHtmlBody(timestamp: string, server: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    .header { background-color: #4CAF50; color: white; padding: 10px; border-radius: 5px; }
    .content { padding: 20px 0; }
    .footer { font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px; }
    .info { background-color: #f5f5f5; padding: 10px; border-left: 4px solid #4CAF50; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📧 Test Email</h2>
    </div>
    <div class="content">
      <p>これはテストメールです。</p>
      <p>This is a test email sent from TypeScript.</p>

      <div class="info">
        <strong>送信情報 / Send Information:</strong><br>
        <strong>Timestamp:</strong> ${timestamp}<br>
        <strong>SMTP Server:</strong> ${server}<br>
        <strong>Language:</strong> TypeScript / Node.js
      </div>

      <p>✅ メール送信システムが正常に動作しています。</p>
      <p>✅ Email system is working correctly.</p>
    </div>
    <div class="footer">
      <p>このメールはSMTP/POP検証環境から送信されました。</p>
      <p>This email was sent from SMTP/POP testing environment.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * メイン実行
 */
async function main() {
  console.log('=== SMTP Test - TypeScript Mail Sender ===');

  const timestamp = new Date().toISOString();

  // MailHog用の設定（ポート1025）
  const mailhogConfig: MailConfig = {
    host: 'localhost',
    port: 1025,
    secure: false,
  };

  // Postfix用の設定（ポート25）
  const postfixConfig: MailConfig = {
    host: 'localhost',
    port: 25,
    secure: false,
  };

  // メール内容
  const mailOptions: MailOptions = {
    from: 'sender@example.com',
    to: 'testuser@example.com',
    subject: 'テストメール - Test Email (TypeScript)',
    text: `
これはテストメールです。
This is a test email.

送信時刻 / Timestamp: ${timestamp}
言語 / Language: TypeScript
    `.trim(),
    html: generateHtmlBody(timestamp, 'MailHog (localhost:1025)'),
  };

  // MailHogへメール送信
  console.log('\n📨 Testing MailHog SMTP (localhost:1025)');
  console.log('='.repeat(50));

  const mailhogSender = new MailSender(mailhogConfig);

  try {
    // 接続確認
    const isReady = await mailhogSender.verify();

    if (isReady) {
      // メール送信
      await mailhogSender.send(mailOptions);
    }
  } catch (error) {
    console.error('MailHog test failed:', error);
  } finally {
    mailhogSender.close();
  }

  console.log('\n');
  console.log('='.repeat(50));
  console.log('✅ Check MailHog Web UI: http://localhost:8025');
  console.log('='.repeat(50));

  // オプション: Postfixもテストする場合
  // console.log('\n📨 Testing Postfix SMTP (localhost:25)');
  // const postfixSender = new MailSender(postfixConfig);
  // try {
  //   await postfixSender.verify();
  //   await postfixSender.send({
  //     ...mailOptions,
  //     html: generateHtmlBody(timestamp, 'Postfix (localhost:25)'),
  //   });
  // } catch (error) {
  //   console.error('Postfix test failed:', error);
  // } finally {
  //   postfixSender.close();
  // }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MailSender, MailConfig, MailOptions };
