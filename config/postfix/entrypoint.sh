#!/bin/sh
set -e

mkdir -p /var/log/postfix

# Start syslog for Postfix logging
rsyslogd

# Ensure lookup tables are up to date (in case of bind mounts)
postmap /etc/postfix/virtual_mailboxes
newaliases

# Fix permissions after possible volume mounts
grep -q '^mail_owner' /etc/postfix/main.cf || true
postfix set-permissions

exec postfix start-fg
