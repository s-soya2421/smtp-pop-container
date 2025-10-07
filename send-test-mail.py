#!/usr/bin/env python3
"""
テストメール送信スクリプト
Python標準ライブラリを使用してSMTP経由でメールを送信
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys

def send_test_email(smtp_host='localhost', smtp_port=1025):
    """テストメールを送信"""

    # メール作成
    msg = MIMEMultipart()
    msg['From'] = 'sender@example.com'
    msg['To'] = 'testuser@example.com'
    msg['Subject'] = 'テストメール - Test Email'

    body = """
    これはテストメールです。
    This is a test email.

    送信時刻: {timestamp}
    SMTP Server: {host}:{port}
    """.format(
        timestamp=__import__('datetime').datetime.now().isoformat(),
        host=smtp_host,
        port=smtp_port
    )

    msg.attach(MIMEText(body, 'plain'))

    try:
        # SMTP接続
        print(f"Connecting to {smtp_host}:{smtp_port}...")
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.set_debuglevel(2)  # デバッグ情報を表示

        # メール送信
        print("\nSending email...")
        text = msg.as_string()
        server.sendmail(msg['From'], msg['To'], text)

        print("\n✓ Email sent successfully!")
        server.quit()
        return True

    except Exception as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    # デフォルトはMailHog (localhost:1025)
    # Postfixを使う場合は: send_test_email('localhost', 25)

    print("=== SMTP Test - Sending to MailHog ===\n")
    send_test_email('localhost', 1025)

    print("\n\n=== Check MailHog Web UI ===")
    print("URL: http://localhost:8025")
