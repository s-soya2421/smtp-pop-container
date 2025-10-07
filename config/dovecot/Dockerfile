FROM alpine:latest

# Dovecotと必要なパッケージをインストール
RUN apk add --no-cache dovecot

# vmailユーザーを作成（dovenull/dovecotはDovecotパッケージが自動作成）
RUN adduser -D -u 1000 -h /var/mail vmail

# ディレクトリ作成
RUN mkdir -p /var/mail /var/log/dovecot && \
    chown -R vmail:vmail /var/mail && \
    chown -R dovecot:dovecot /var/log/dovecot

EXPOSE 24 110 143 993 995

CMD ["dovecot", "-F"]
