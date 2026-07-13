FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json \
  && mkdir -p /app/.browser-profiles \
  && chown -R pwuser:pwuser /app

ENV NODE_ENV=production
ENV PORT=8791
ENV DIGITAL_PUBLISH_DRY_RUN=true
ENV DIGITAL_WORKER_ID=worker-vps
ENV DIGITAL_BROWSER_STORAGE_DIR=/app/.browser-profiles
ENV DIGITAL_BROWSER_HEADLESS=true
ENV DIGITAL_BROWSER_CHANNEL=chromium

USER pwuser
EXPOSE 8791

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8791)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
