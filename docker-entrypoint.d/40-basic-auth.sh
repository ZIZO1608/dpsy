#!/bin/sh
# Builds the preview password file from environment variables set in Coolify.
# Fails closed: without a username and password the container refuses to start,
# so the preview is never served without protection.
set -eu

if [ -z "${PREVIEW_USER:-}" ] || [ -z "${PREVIEW_PASSWORD:-}" ]; then
  echo "ERROR: set PREVIEW_USER and PREVIEW_PASSWORD in Coolify (Environment Variables) before deploying." >&2
  exit 1
fi

htpasswd -bcB /etc/nginx/.htpasswd "$PREVIEW_USER" "$PREVIEW_PASSWORD" >/dev/null 2>&1
chmod 640 /etc/nginx/.htpasswd
chown root:nginx /etc/nginx/.htpasswd
echo "Preview password file ready for user '$PREVIEW_USER'."
