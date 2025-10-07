FROM alpine:3.19

RUN apk add --no-cache postfix cyrus-sasl cyrus-sasl-login rsyslog

COPY main.cf /etc/postfix/main.cf
COPY master.cf /etc/postfix/master.cf
COPY virtual_mailboxes /etc/postfix/virtual_mailboxes
COPY aliases /etc/postfix/aliases
COPY entrypoint.sh /entrypoint.sh

RUN postmap /etc/postfix/virtual_mailboxes \
  && newaliases \
  && chmod +x /entrypoint.sh

EXPOSE 25 587

CMD ["/entrypoint.sh"]
