# SMTP/POP検証コンテナ環境

> 🛠️ 現在も検証・改善を続けているサーバ環境です。挙動や設定を試しながら更新しているため、最新の変更内容はリポジトリで確認してください。

Dockerを使用したSMTP/POPサーバの動作検証環境です。パケットレベルのログ取得とエラー監視を行っていろいろ勉強するために使う

> ⚠️ **検証専用です。** 本環境の利用によって生じたいかなる結果についても作成者・依頼者は責任を負いません。 実運用へ転用する場合はすべて自己責任で対処してください。

Postfix が SMTP を受信し、Dovecot の LMTP に転送して Maildir を更新し、POP/IMAP クライアントが同じストレージを参照する構成を一通り観察できます。

## 構成

### サービス一覧

| サービス | 説明 | ポート | WebUI |
|---------|------|--------|-------|
| **Postfix** | SMTPサーバ（LMTPでDovecotに配送） | 25, 587 | - |
| **MailHog** | 開発用SMTPサーバ（メール捕獲） | 1025 (SMTP) | http://localhost:8025 |
| **Dovecot** | POP/IMAPサーバ | 110 (POP3), 143 (IMAP) | - |
| **tcpdump** | パケットキャプチャ | - | - |
| **Dozzle** | Dockerログビューア | - | http://localhost:8080 |

### ディレクトリ構造

```
.
├── docker-compose.yml          # Docker Compose設定
├── package.json               # Node.js依存関係
├── tsconfig.json              # TypeScript設定
├── src/                       # TypeScriptソースコード
│   ├── test-smtp.ts          # SMTPテスト（TypeScript）
│   ├── test-pop.ts           # POPテスト（TypeScript）
│   ├── send-test-mail.ts     # メール送信（TypeScript）
│   └── test-flow.ts          # SMTP→POP一括検証
├── config/
│   ├── postfix/               # Postfix設定とコンテナ定義
│   │   ├── Dockerfile
│   │   ├── entrypoint.sh
│   │   ├── main.cf
│   │   ├── master.cf
│   │   ├── virtual_mailboxes
│   │   └── aliases
│   └── dovecot/               # Dovecot設定ファイル
│       ├── Dockerfile
│       ├── dovecot.conf       # Dovecot設定
│       └── users              # テストユーザー
├── logs/                      # 各種ログファイル
│   ├── postfix/              # Postfixログ
│   ├── dovecot/              # Dovecotログ
│   └── tcpdump.log           # パケットキャプチャログ
├── pcap/                      # パケットキャプチャファイル(.pcap)
├── test-smtp.sh              # SMTP手動テスト（Shell）
├── test-pop.sh               # POP手動テスト（Shell）
└── send-test-mail.py         # メール送信（Python）
```

## メールフロー

1. 開発・検証用クライアントは Postfix (25/587) に接続してメールを送信します。
2. Postfix は LMTP を使って Dovecot (`dovecot:24`) へ配送し、Dovecot が Maildir に書き込みます。
3. POP3/IMAP クライアントは Dovecot 経由で `/var/mail/<ユーザー>/Maildir/` のメールを取得します。
4. MailHog は SMTP の挙動確認用サンドボックス、tcpdump は同一ネットワーク上の主要ポートをキャプチャします。

メールの流れを追跡したい場合は Maildir の中身 (`maildata` ボリューム) と `pcap` ファイル、Dozzle のログを合わせて確認してください。

## セットアップ

### 1. Node.js依存関係のインストール

```bash
# npm パッケージをインストール
npm install
```

### 2. 環境起動

```bash
# コンテナをビルド＆起動 (初回は --build 推奨)
docker-compose up -d --build

# 2回目以降は --build を省略できます
# docker-compose up -d

# ログを確認
docker-compose logs -f
```

### 3. 動作確認

```bash
# 全サービスの状態確認
docker-compose ps

# 個別のログ確認
docker-compose logs postfix
docker-compose logs dovecot
docker-compose logs tcpdump
```

## テストユーザー

以下のテストユーザーが利用可能です（`config/dovecot/users`で定義）：

| ユーザー名 | パスワード |
|-----------|----------|
| testuser  | testpass |
| user1     | password1 |
| user2     | password2 |

## 使用方法

### SMTPテスト

#### 方法1: TypeScriptスクリプト（推奨）

```bash
# Raw TCP接続でSMTPプロトコルを直接テスト
npm run test:smtp

# または
npx tsx src/test-smtp.ts
```

#### 方法2: nodemailerでメール送信（TypeScript）

```bash
# 高レベルAPIを使用したメール送信
npm run send:mail

# または
npx tsx src/send-test-mail.ts
```

#### 方法3: シェルスクリプト（telnet使用）

```bash
chmod +x test-smtp.sh
./test-smtp.sh
```

#### 方法4: Pythonスクリプト

```bash
chmod +x send-test-mail.py
python3 send-test-mail.py
```

#### 方法5: 手動テスト（telnet）

```bash
telnet localhost 1025
HELO example.com
MAIL FROM:<sender@example.com>
RCPT TO:<receiver@example.com>
DATA
Subject: Test Email

This is a test message.
.
QUIT
```

#### MailHog WebUIで確認

送信したメールはMailHogで確認できます：
- URL: http://localhost:8025

### POPテスト

#### 方法1: TypeScriptスクリプト（推奨）

```bash
# Raw TCP接続でPOP3プロトコルを直接テスト
npm run test:pop

# または
npx tsx src/test-pop.ts
```

#### 方法2: シェルスクリプト

```bash
chmod +x test-pop.sh
./test-pop.sh
```

#### 方法3: 手動テスト

```bash
telnet localhost 110
USER testuser
PASS testpass
STAT
LIST
RETR 1
QUIT
```

#### 方法4: メールクライアント

| 設定項目 | 値 |
|---------|---|
| サーバー | localhost |
| ポート | 110 (POP3) または 143 (IMAP) |
| ユーザー名 | testuser |
| パスワード | testpass |
| 暗号化 | なし（検証用） |

### SMTP→POPエンドツーエンド

```bash
# Postfixへ送信し、Dovecot経由でPOP3から取得
npm run test:flow
```

一意のトークンを含んだメールを送信し、POP3で最新メッセージを取得・検証します。

### 全テストを一括実行

```bash
# SMTP, POP, MailHog送信に加えて Postfix→POP のフローを検証
npm run test:all
```

## ログとパケットキャプチャ

### パケットキャプチャの確認

```bash
# キャプチャファイルの一覧
ls -lh pcap/

# Wiresharkで開く
wireshark pcap/capture-YYYYMMDD-HHMMSS.pcap

# tcpdumpで直接表示
tcpdump -r pcap/capture-YYYYMMDD-HHMMSS.pcap -A

# リアルタイムでキャプチャログを確認
tail -f logs/tcpdump.log
```

### アプリケーションログ

```bash
# Postfixログ
tail -f logs/postfix/mail.log

# Dovecotログ
tail -f logs/dovecot/dovecot.log
tail -f logs/dovecot/debug.log

# 全てのDockerログをWebで確認（Dozzle）
# http://localhost:8080
```

### パケットフィルタ対象ポート

tcpdumpは以下のポートを監視しています：
- 25 (SMTP)
- 110 (POP3)
- 143 (IMAP)
- 587 (SMTP Submission)
- 1025 (MailHog SMTP)

## トラブルシューティング

### ポートが使用中の場合

```bash
# 使用中のポートを確認
sudo netstat -tlnp | grep -E ':(25|110|143|587|1025|8025|8080)'

# ポートを変更する場合はdocker-compose.ymlを編集
```

### メールが届かない場合

```bash
# Postfixのキューを確認
docker-compose exec postfix mailq

# Dovecotの接続テスト
docker-compose exec dovecot doveadm auth test testuser testpass

# 詳細なログを確認
docker-compose logs dovecot | grep -i error
docker-compose logs postfix | grep -i error
```

### パケットキャプチャが動作しない場合

```bash
# tcpdumpコンテナのログを確認
docker-compose logs tcpdump

# 手動でキャプチャを実行
docker-compose exec tcpdump tcpdump -i any port 25 -v
```

## 環境のクリーンアップ

```bash
# コンテナを停止＆削除
docker-compose down

# ボリュームも含めて完全削除
docker-compose down -v

# ログとキャプチャファイルを削除
rm -rf logs/* pcap/*
```

## セキュリティに関する注意

⚠️ **この環境は検証・開発専用です**

- パスワードは平文で保存されています
- SSL/TLS暗号化は無効化されています
- 認証なしでメール送信が可能です
- 本番環境では使用しないでください

## カスタマイズ

### ユーザーの追加

`config/dovecot/users`にユーザーを追加：

```
newuser:{PLAIN}newpassword:1000:1000::/var/mail/newuser::
```

再起動：
```bash
docker-compose restart dovecot
```

### Postfix設定の変更

`config/postfix/` 以下の `main.cf` や `virtual_mailboxes` を編集すると配送ポリシーや宛先を調整できます。
変更後はビルドキャッシュを更新するために `docker-compose build postfix` を実行し、`docker-compose up -d postfix` で再起動してください。

### Dovecot設定の変更

`config/dovecot/dovecot.conf`を編集後：

```bash
docker-compose restart dovecot
```

### パケットキャプチャのフィルタ変更

`docker-compose.yml`のtcpdumpコマンドを編集してフィルタ条件を変更できます。

## TypeScriptスクリプトについて

### 特徴

- **型安全**: TypeScriptによる完全な型チェック
- **プロトコル直接テスト**: Raw TCP接続でSMTP/POP3プロトコルを直接操作
- **詳細なログ**: 送受信データをすべて表示
- **エラーハンドリング**: 適切なエラー処理と例外管理
- **拡張性**: クラスベース設計で再利用可能

### 主な機能

#### test-smtp.ts
- PostfixとMailHogの両方をテスト
- SMTP通信の完全なトレース
- HELOからQUITまでの全コマンドを実行

#### test-pop.ts
- 複数ユーザーでのPOP3接続テスト
- USER/PASS認証からSTAT/LIST/UIDL/RETRコマンドまで実行
- パスワードをマスキングして表示
- 最新メッセージのプレビューと期待値チェックに対応

#### send-test-mail.ts
- nodemailerを使用した高レベルAPIでのメール送信
- HTML形式メール対応
- SMTP接続の事前検証機能

#### test-flow.ts
- Postfixへメールを送信し、Dovecot POP3で取得する一連の流れを自動化
- メール本文に埋め込んだトークンをPOP3で検証して配送確認

### ビルド（オプション）

```bash
# TypeScriptをJavaScriptにコンパイル
npm run build

# コンパイル後のJSファイルを実行
node dist/test-smtp.js
```

## 参考リンク

- [Postfix Documentation](http://www.postfix.org/documentation.html)
- [Dovecot Documentation](https://doc.dovecot.org/)
- [MailHog](https://github.com/mailhog/MailHog)
- [tcpdump Tutorial](https://www.tcpdump.org/manpages/tcpdump.1.html)
- [Wireshark](https://www.wireshark.org/)
- [Nodemailer](https://nodemailer.com/)
- [TypeScript](https://www.typescriptlang.org/)
