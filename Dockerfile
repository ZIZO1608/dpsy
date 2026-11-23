FROM nginx:1.27-alpine

# htpasswd for the preview password (bcrypt)
RUN apk add --no-cache apache2-utils

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-basic-auth.sh /docker-entrypoint.d/40-basic-auth.sh
RUN chmod +x /docker-entrypoint.d/40-basic-auth.sh

COPY site/ /usr/share/nginx/html/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
