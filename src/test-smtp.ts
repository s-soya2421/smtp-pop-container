#!/usr/bin/env tsx
/**
 * SMTPサーバテストスクリプト（TypeScript版）
 * Raw TCP接続でSMTPプロトコルを直接テスト
 */

import { Socket } from 'net';

interface SMTPTestConfig {
  host: string;
  port: number;
  name: string;
}

class SMTPTester {
  private socket: Socket | null = null;
  private buffer = '';

  constructor(private config: SMTPTestConfig) {}

  /**
   * SMTP接続とコマンド実行
   */
  async test(): Promise<void> {
    console.log(`\n=== Testing ${this.config.name} on port ${this.config.port} ===\n`);

    return new Promise((resolve, reject) => {
      this.socket = new Socket();
      const commandQueue: string[] = [
        'HELO example.com',
        'MAIL FROM:<sender@example.com>',
        'RCPT TO:<receiver@example.com>',
        'DATA',
        'Subject: Test Email from TypeScript\r\nFrom: sender@example.com\r\nTo: receiver@example.com\r\n\r\nThis is a test email sent via TypeScript SMTP tester.\r\n.',
        'QUIT',
      ];

      let currentCommand: string | null = null;
      let settled = false;

      const resolveOnce = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      const rejectOnce = (err: Error) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      const sendNextCommand = () => {
        if (commandQueue.length === 0) {
          this.socket?.end();
          return;
        }

        currentCommand = commandQueue.shift() ?? null;

        if (currentCommand) {
          const preview =
            currentCommand.length > 60
              ? `${currentCommand.substring(0, 60)}...`
              : currentCommand;
          console.log(`--> ${preview}`);
          this.socket?.write(currentCommand + '\r\n');
        }
      };

      // データ受信ハンドラ
      this.socket.on('data', (data: Buffer) => {
        const response = data.toString();
        this.buffer += response;

        // 改行で分割して各行を処理
        const lines = this.buffer.split('\r\n');
        this.buffer = lines.pop() || ''; // 最後の不完全な行は保持

        for (const line of lines) {
          if (line) {
            console.log(`<-- ${line}`);

            // レスポンスコードをチェック（220, 250, 354など）
            const code = parseInt(line.substring(0, 3));

            if (Number.isNaN(code)) {
              continue;
            }

            if (code >= 400) {
              rejectOnce(new Error(`SMTP error: ${line}`));
              this.socket?.end();
              return;
            }

            // 次のコマンドを送信
            if (code === 221) {
              // QUIT のレスポンスを受信したら終了
              setTimeout(() => {
                this.socket?.end();
                resolveOnce();
              }, 100);
              return;
            }

            if (code === 220) {
              if (currentCommand === null) {
                setTimeout(() => sendNextCommand(), 300);
              } else {
                setTimeout(() => sendNextCommand(), 250);
              }
              continue;
            }

            if (code === 354) {
              // DATAコマンドに対する応答、直ちにメール本文を送信
              setTimeout(() => sendNextCommand(), 200);
              return;
            }

            if (code >= 200 && code < 400) {
              setTimeout(() => sendNextCommand(), 250);
            }
          }
        }
      });

      // 接続ハンドラ
      this.socket.on('connect', () => {
        console.log(`✓ Connected to ${this.config.host}:${this.config.port}`);
      });

      // エラーハンドラ
      this.socket.on('error', (err: Error) => {
        console.error(`✗ Error: ${err.message}`);
        rejectOnce(err);
      });

      // 切断ハンドラ
      this.socket.on('close', () => {
        console.log(`\n✓ Connection closed\n`);
        if (!settled) {
          rejectOnce(new Error('Connection closed before QUIT response'));
        }
      });

      // 接続開始
      this.socket.connect(this.config.port, this.config.host);
    });
  }
}

/**
 * メイン実行
 */
async function main() {
  console.log('=== SMTP Test Script (TypeScript) ===');

  // Postfixをテスト（ポート25）
  try {
    const postfixTester = new SMTPTester({
      host: 'localhost',
      port: 25,
      name: 'Postfix SMTP',
    });
    await postfixTester.test();
  } catch (err) {
    console.error('Postfix test failed:', err);
  }

  // MailHogをテスト（ポート1025）
  try {
    const mailhogTester = new SMTPTester({
      host: 'localhost',
      port: 1025,
      name: 'MailHog SMTP',
    });
    await mailhogTester.test();
  } catch (err) {
    console.error('MailHog test failed:', err);
  }

  console.log('=== Test Complete ===');
  console.log('Check MailHog Web UI at http://localhost:8025');
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { SMTPTester };
