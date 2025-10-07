#!/bin/bash
# SMTPサーバのテストスクリプト

echo "=== SMTP Test Script ==="
echo ""

# Postfixへのメール送信テスト（ポート25）
echo "1. Testing SMTP (Postfix) on port 25..."
(
  echo "HELO example.com"
  sleep 1
  echo "MAIL FROM:<sender@example.com>"
  sleep 1
  echo "RCPT TO:<receiver@example.com>"
  sleep 1
  echo "DATA"
  sleep 1
  echo "Subject: Test Email from SMTP"
  echo "From: sender@example.com"
  echo "To: receiver@example.com"
  echo ""
  echo "This is a test email sent via SMTP."
  echo "."
  sleep 1
  echo "QUIT"
) | telnet localhost 25

echo ""
echo "2. Testing SMTP (MailHog) on port 1025..."
(
  echo "HELO example.com"
  sleep 1
  echo "MAIL FROM:<test@example.com>"
  sleep 1
  echo "RCPT TO:<user@example.com>"
  sleep 1
  echo "DATA"
  sleep 1
  echo "Subject: Test Email from MailHog"
  echo "From: test@example.com"
  echo "To: user@example.com"
  echo ""
  echo "This is a test email sent via MailHog."
  echo "."
  sleep 1
  echo "QUIT"
) | telnet localhost 1025

echo ""
echo "=== Test Complete ==="
echo "Check MailHog Web UI at http://localhost:8025"
