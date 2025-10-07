#!/usr/bin/env tsx
/**
 * End-to-end flow test:
 * 1. Send an email to Postfix.
 * 2. Retrieve the most recent message via Dovecot POP3.
 */

import { MailSender, type MailConfig, type MailOptions } from './send-test-mail.js';
import { POP3Tester, type POP3TestConfig } from './test-pop.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createUniqueToken(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

async function main() {
  console.log('=== End-to-End SMTP → POP3 Test ===');

  const token = createUniqueToken();
  const postfixConfig: MailConfig = {
    host: 'localhost',
    port: 25,
    secure: false,
  };

  const postfixSender = new MailSender(postfixConfig);
  const subject = `E2E Flow Test ${token}`;

  const mailOptions: MailOptions = {
    from: 'sender@example.com',
    to: 'testuser@example.com',
    subject,
    text: [
      'This is an automated flow test email.',
      `Token: ${token}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n'),
    html: `
      <p>This is an automated flow test email.</p>
      <p><strong>Token:</strong> ${token}</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    `.trim(),
  };

  try {
    const ready = await postfixSender.verify();
    if (!ready) {
      throw new Error('Postfix SMTP verification failed');
    }

    await postfixSender.send(mailOptions);
  } finally {
    postfixSender.close();
  }

  // LMTP 経由で Dovecot に配送されるまで少し待機
  await delay(1500);

  const popConfig: POP3TestConfig = {
    host: 'localhost',
    port: 110,
    username: 'testuser',
    password: 'testpass',
    expectedContent: token,
  };

  const popTester = new POP3Tester(popConfig);
  await popTester.test();

  console.log('=== Flow Test Complete ===');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Flow test failed:', err);
    process.exitCode = 1;
  });
}
