FROM mcr.microsoft.com/playwright:v1.49.0-jammy
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json
ENV DIGITAL_PUBLISH_DRY_RUN=true
ENV PORT=8791
EXPOSE 8791
CMD ["node", "dist/index.js"]
