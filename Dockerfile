FROM node:22-slim

ENV NODE_ENV=production \
    PORT=80 \
    DATA_DIR=/data \
    SITE_DIR=/app/site \
    REQUIRE_PREVIEW_AUTH=1 \
    NODE_NO_WARNINGS=1

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server/ ./
COPY site/ /app/site/

# orders, accounts, settings and the image cache live here: mount a persistent volume on /data
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "index.js"]
