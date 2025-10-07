#!/usr/bin/env tsx
/**
 * POP3サーバテストスクリプト（TypeScript版）
 * Raw TCP接続でPOP3プロトコルを直接テスト
 */

import { Socket } from 'net';

interface POP3TestConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  expectedContent?: string;
}

interface POP3Response {
  success: boolean;
  message: string;
  data?: string[];
}

class POP3Tester {
  private socket: Socket | null = null;
  private buffer = '';

  constructor(private config: POP3TestConfig) {}

  /**
   * POP3接続と各種コマンドテスト
   */
  async test(): Promise<void> {
    console.log(`\n=== Testing POP3 Server on ${this.config.host}:${this.config.port} ===\n`);
    console.log(`Username: ${this.config.username}`);
    console.log(`Password: ${'*'.repeat(this.config.password.length)}\n`);

    return new Promise((resolve, reject) => {
      this.socket = new Socket();

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

      const commandQueue: string[] = [
        `USER ${this.config.username}`,
        `PASS ${this.config.password}`,
        'STAT',
        'LIST',
        'UIDL',
        'QUIT',
      ];

      let currentCommand: string | null = null;
      let hasMessages = false;
      let retrievalQueued = false;
      let messagePreview: string[] = [];
      const availableMessageIds: number[] = [];
      let retrievalMessageId: number | null = null;

      const enqueueRetrIfRequired = () => {
        if (!retrievalQueued && hasMessages && commandQueue.length === 1 && commandQueue[0] === 'QUIT') {
          const target = retrievalMessageId ?? 1;
          console.log(`➡️  Enqueue RETR ${target} for verification`);
          commandQueue.unshift(`RETR ${target}`);
          retrievalQueued = true;
        }
      };

      const sendNextCommand = () => {
        enqueueRetrIfRequired();

        if (commandQueue.length === 0) {
          // すべてのコマンドを実行済み
          console.log('\n✓ All commands executed successfully\n');
          this.socket?.end();
          resolveOnce();
          return;
        }

        currentCommand = commandQueue.shift() ?? null;

        if (currentCommand) {
          setTimeout(() => this.sendCommand(currentCommand as string), 400);
        }
      };

      // データ受信ハンドラ
      this.socket.on('data', (data: Buffer) => {
        this.buffer += data.toString();

        const segments = this.buffer.split('\r\n');
        this.buffer = segments.pop() ?? '';

        let hasTerminator = false;
        const lines: string[] = [];

        for (const line of segments) {
          if (line === '.') {
            hasTerminator = true;
            lines.push(line);
          } else if (line.length > 0) {
            lines.push(line);
          }
        }

        if (lines.length === 0 && !hasTerminator) {
          return;
        }

        for (const line of lines) {
          console.log(`<-- ${line}`);

          if (currentCommand?.startsWith('RETR') && line !== '.' && !line.startsWith('+OK')) {
            messagePreview.push(line);
          } else if (currentCommand === 'LIST') {
            const match = line.match(/^(\d+)\s+/);
            if (match) {
              availableMessageIds.push(Number.parseInt(match[1], 10));
            }
          }
        }

        const firstLine =
          lines.find((line) => line.length > 0 && line !== '.') || '';
        const isSuccess = firstLine.startsWith('+OK');
        const isError = firstLine.startsWith('-ERR');

        if (isError) {
          console.error(`Server responded with error: ${firstLine}`);
          this.socket?.end();
          rejectOnce(new Error(firstLine));
          return;
        }

        if (currentCommand === 'STAT' && isSuccess) {
          const match = firstLine.match(/^\+OK\s+(\d+)/);
          if (match) {
            const messageCount = Number.parseInt(match[1], 10);
            hasMessages = Number.isFinite(messageCount) && messageCount > 0;
            console.log(`ℹ️  Messages on server: ${hasMessages ? messageCount : 0}`);
          }
        }

        if (currentCommand === 'LIST' && hasTerminator) {
          if (availableMessageIds.length > 0) {
            retrievalMessageId = Math.max(...availableMessageIds);
            hasMessages = true;
            console.log(`ℹ️  Latest message index: ${retrievalMessageId}`);
          }
        }

        const isMultiLine = currentCommand
          ? ['LIST', 'UIDL'].includes(currentCommand) ||
            currentCommand.startsWith('RETR')
          : false;

        const readyForNext =
          (currentCommand === null && isSuccess) ||
          (currentCommand !== null &&
            isSuccess &&
            (!isMultiLine || hasTerminator));

        if (hasTerminator && currentCommand?.startsWith('RETR')) {
          const previewText = messagePreview.join('\n');
          console.log('\n--- Message Preview ---');
          messagePreview.slice(0, 20).forEach((line) => console.log(line));
          if (messagePreview.length > 20) {
            console.log('(truncated)');
          }
          if (this.config.expectedContent) {
            if (previewText.includes(this.config.expectedContent)) {
              console.log(`✓ Expected content found: "${this.config.expectedContent}"`);
            } else {
              console.warn(
                `⚠️ Expected content not found: "${this.config.expectedContent}"`
              );
            }
          }
          console.log('--- End Preview ---\n');
          messagePreview = [];
        }

        if (readyForNext) {
          sendNextCommand();
        }
      });

      // 接続ハンドラ
      this.socket.on('connect', () => {
        console.log(`✓ Connected to ${this.config.host}:${this.config.port}`);
      });

      // エラーハンドラ
      this.socket.on('error', (err: Error) => {
        console.error(`\n✗ Error: ${err.message}\n`);
        rejectOnce(err);
      });

      // 切断ハンドラ
      this.socket.on('close', () => {
        console.log('✓ Connection closed\n');
        if (!settled) {
          rejectOnce(new Error('Connection closed before commands finished'));
        }
      });

      // 接続開始
      this.socket.connect(this.config.port, this.config.host);
    });
  }

  /**
   * コマンドを送信
   */
  private sendCommand(command: string): void {
    if (!this.socket) return;

    // PASSコマンドの場合、パスワードを隠して表示
    if (command.startsWith('PASS')) {
      console.log(`--> PASS ${'*'.repeat(this.config.password.length)}`);
    } else {
      console.log(`--> ${command}`);
    }

    this.socket.write(command + '\r\n');
  }
}

/**
 * メイン実行
 */
async function main() {
  console.log('=== POP3 Test Script (TypeScript) ===');

  // テストユーザー一覧
  const testUsers: POP3TestConfig[] = [
    {
      host: 'localhost',
      port: 110,
      username: 'testuser',
      password: 'testpass',
    },
    {
      host: 'localhost',
      port: 110,
      username: 'user1',
      password: 'password1',
    },
  ];

  // 各ユーザーでテスト
  for (const config of testUsers) {
    try {
      const tester = new POP3Tester(config);
      await tester.test();
      await new Promise((resolve) => setTimeout(resolve, 1000)); // テスト間の待機
    } catch (err) {
      console.error(`Test failed for ${config.username}:`, err);
    }
  }

  console.log('=== All Tests Complete ===');
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { POP3Tester };
export type { POP3TestConfig };
