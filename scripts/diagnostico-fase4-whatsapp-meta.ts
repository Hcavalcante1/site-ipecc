/**
 * Diagnóstico de prontidão da Fase 4 (WhatsApp Meta sandbox).
 * Uso:
 *   npm run diagnostico:fase4-whatsapp-meta
 */

import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { loadEnvLocal } from "./lib/loadEnvLocal";

const ROOT = join(__dirname, "..");
const STATUS_PATH = join(ROOT, "docs/ENTERPRISE-STATUS.md");
const REPORTS = [
  "reports/whatsapp-meta.txt",
  "reports/whatsapp-webhook.txt",
  "reports/whatsapp-webhook-http.txt",
  "reports/whatsapp-handoff-fase4.txt",
];

function logOk(msg: string) {
  console.log(`OK: ${msg}`);
}

function logWarn(msg: string) {
  console.log(`WARN: ${msg}`);
}

function logFail(msg: string) {
  console.log(`FALHA: ${msg}`);
}

async function checkDevServer() {
  try {
    const res = await fetch("http://localhost:3000", { method: "GET" });
    if (res.status >= 200 && res.status < 500) {
      logOk(`dev server ativo em http://localhost:3000 (HTTP ${res.status})`);
      return true;
    }
    logWarn(`dev server respondeu HTTP inesperado: ${res.status}`);
    return false;
  } catch {
    logWarn("dev server não acessível em http://localhost:3000");
    return false;
  }
}

function checkEnv() {
  try {
    loadEnvLocal({
      keys: [
        "WHATSAPP_VERIFY_TOKEN",
        "WHATSAPP_APP_SECRET",
        "WHATSAPP_ACCESS_TOKEN",
        "WHATSAPP_PHONE_NUMBER_ID",
      ],
    });
  } catch (e) {
    logFail(
      `.env.local não carregado: ${e instanceof Error ? e.message : String(e)}`
    );
    return false;
  }

  const required = [
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
  ];
  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    logFail(`variáveis ausentes: ${missing.join(", ")}`);
    console.log(
      "\nPróximo passo: copie o bloco WhatsApp de .env.example para .env.local"
    );
    console.log("e preencha com credenciais do sandbox Meta.");
    console.log("Guia: docs/WHATSAPP-META-SANDBOX.md");
    console.log("Depois: npm run validar:env-whatsapp-meta");
    return false;
  }
  logOk("variáveis obrigatórias WHATSAPP_* presentes");
  return true;
}

function checkStatusMarkers() {
  if (!existsSync(STATUS_PATH)) {
    logFail("docs/ENTERPRISE-STATUS.md não encontrado");
    return false;
  }
  const src = readFileSync(STATUS_PATH, "utf8");
  const start = "<!-- FASE4_STATUS_AUTO_START -->";
  const end = "<!-- FASE4_STATUS_AUTO_END -->";
  const s = src.indexOf(start);
  const e = src.indexOf(end);
  if (s < 0 || e < 0 || e <= s) {
    logFail("marcadores automáticos da Fase 4 ausentes/inválidos");
    return false;
  }
  logOk("marcadores automáticos da Fase 4 válidos");
  return true;
}

function checkReports() {
  let any = false;
  for (const rel of REPORTS) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      continue;
    }
    any = true;
    const ageH = (Date.now() - statSync(abs).mtimeMs) / 36e5;
    logOk(`${rel} encontrado (${ageH.toFixed(1)}h)`);
  }
  if (!any) {
    logWarn("nenhum report da Fase 4 encontrado em ./reports (normal antes da 1a execução)");
  }
}

async function main() {
  console.log("=== Diagnóstico Fase 4 — WhatsApp Meta ===");
  const envOk = checkEnv();
  const statusOk = checkStatusMarkers();
  await checkDevServer();
  checkReports();

  if (!envOk || !statusOk) {
    process.exitCode = 1;
    console.log("\nDiagnóstico: FALHA (corrija itens acima).");
    return;
  }
  console.log("\nDiagnóstico: OK para executar a Fase 4.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
