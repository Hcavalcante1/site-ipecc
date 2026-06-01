/**
 * Prepara variáveis WHATSAPP_* no .env.local para sandbox local (dry-run).
 * Não sobrescreve chaves já definidas.
 *
 * Uso:
 *   npm run preparar:env-whatsapp-meta              # só diagnóstico
 *   npm run preparar:env-whatsapp-meta -- --aplicar # acrescenta template local
 */

import { existsSync, readFileSync, appendFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env.local");

const REQUIRED = [
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_API_VERSION",
  "WHATSAPP_BOT_ENABLED",
  "WHATSAPP_DRY_RUN",
] as const;

const LOCAL_TEMPLATE = `
# --- WhatsApp Meta (template local IPECC — dry-run, não usar em produção) ---
WHATSAPP_VERIFY_TOKEN=ipecc_verify_staging_local
WHATSAPP_APP_SECRET=ipecc_local_app_secret_staging
WHATSAPP_ACCESS_TOKEN=local_dry_run_no_graph
WHATSAPP_PHONE_NUMBER_ID=000000000000000
WHATSAPP_API_VERSION=v21.0
WHATSAPP_BOT_ENABLED=1
WHATSAPP_DRY_RUN=1
WHATSAPP_PERSIST_SUPABASE=0
WHATSAPP_LOG=1
`;

function parseKeys(src: string): Set<string> {
  const keys = new Set<string>();
  for (const line of src.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) keys.add(t.slice(0, i).trim());
  }
  return keys;
}

function missingKeys(src: string): string[] {
  const present = parseKeys(src);
  return REQUIRED.filter((k) => !present.has(k));
}

function main() {
  const aplicar = process.argv.includes("--aplicar");

  if (!existsSync(ENV_PATH)) {
    console.error("FALHA: .env.local não encontrado. Copie de .env.example primeiro.");
    process.exit(1);
  }

  const src = readFileSync(ENV_PATH, "utf8");
  const missing = missingKeys(src);

  if (missing.length === 0) {
    console.log("OK: todas as chaves WHATSAPP_* obrigatórias já existem em .env.local");
    console.log("Próximo: npm run validar:env-whatsapp-meta");
    return;
  }

  console.log("Chaves ausentes:", missing.join(", "));

  if (!aplicar) {
    console.log("\nPara acrescentar template local (dry-run):");
    console.log("  npm run preparar:env-whatsapp-meta -- --aplicar");
    console.log("Guia completo: docs/WHATSAPP-META-SANDBOX.md");
    process.exit(1);
  }

  appendFileSync(ENV_PATH, LOCAL_TEMPLATE, "utf8");
  console.log("OK: template local acrescentado ao .env.local");
  console.log("IMPORTANTE: reinicie `npm run dev` para o Next.js carregar as variáveis.");
  console.log("Depois: npm run validar:env-whatsapp-meta && npm run fase4:whatsapp-meta:full");
}

main();
