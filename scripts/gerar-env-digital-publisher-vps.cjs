/**
 * Gera services/digital-publisher/.env a partir do .env.local da raiz (para VPS).
 * Uso: node scripts/gerar-env-digital-publisher-vps.cjs
 * Não imprime a service role no terminal.
 */
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Falta .env.local na raiz do projeto.");
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

function main() {
  loadEnvLocal();
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    console.error("Falta SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL ou SERVICE_ROLE.");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "services", "digital-publisher");
  const outPath = path.join(outDir, ".env");
  const body = [
    `SUPABASE_URL=${url}`,
    `SUPABASE_SERVICE_ROLE_KEY=${key}`,
    `DIGITAL_WORKER_ID=worker-vps`,
    `DIGITAL_WORKER_POLL_INTERVAL_MS=15000`,
    `DIGITAL_MAX_PUBLISH_ATTEMPTS=4`,
    `DIGITAL_LOCK_TTL_MS=600000`,
    `PORT=8791`,
    `DIGITAL_PUBLISH_DRY_RUN=false`,
    `DIGITAL_BROWSER_STORAGE_DIR=/app/.browser-profiles`,
    `DIGITAL_BROWSER_CHANNEL=chromium`,
    `DIGITAL_BROWSER_HEADLESS=true`,
    `DIGITAL_CONNECT_TIMEOUT_MS=900000`,
    `DIGITAL_CONNECT_KEEP_OPEN_MS=90000`,
    "",
  ].join("\n");

  fs.writeFileSync(outPath, body, "utf8");
  console.log("OK escrito:", outPath);
  console.log("Próximo: copie esta pasta para o VPS e rode docker compose up -d --build");
  console.log("Guia: docs/DIGITAL-PUBLISHER-VPS.md");
}

main();
