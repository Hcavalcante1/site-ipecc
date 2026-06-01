/**
 * Panorama de prontidão enterprise (ops + Fase 4 parcial/completa).
 * Uso: npm run validar:enterprise-readiness
 */

import { existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = join(__dirname, "..");
const REPORTS = [
  "reports/whatsapp-meta.txt",
  "reports/whatsapp-webhook.txt",
  "reports/whatsapp-webhook-http.txt",
  "reports/whatsapp-handoff-fase4.txt",
];

function run(label: string, cmd: string, opts?: { quiet?: boolean }): boolean {
  console.log(`\n=== ${label} ===`);
  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: opts?.quiet ? "pipe" : "inherit",
    });
    console.log(`OK: ${label}`);
    return true;
  } catch {
    if (!opts?.quiet) {
      console.error(`FALHA: ${label}`);
    }
    return false;
  }
}

function main() {
  console.log("=== Prontidão Enterprise IPECC ===\n");

  let ok = true;

  if (!run("estrutura operacional", "npm run validar:enterprise-ops")) {
    ok = false;
  }

  const hasReports = REPORTS.every((r) => existsSync(join(ROOT, r)));
  const envOk = run("ambiente WhatsApp Meta", "npm run validar:env-whatsapp-meta", {
    quiet: true,
  });

  if (!hasReports) {
    console.log("\nWARN: reports da Fase 4 ausentes — rode npm run coletar:evidencias-whatsapp-meta:parcial");
  } else if (envOk) {
    if (run("DoD Fase 4 (completo)", "npm run validar:dod-whatsapp-meta")) {
      console.log("\nOK: Fase 4 WhatsApp Meta com DoD completo.");
    } else {
      ok = false;
    }
  } else if (
    run("DoD Fase 4 (parcial)", "npm run validar:dod-whatsapp-meta:parcial", {
      quiet: false,
    })
  ) {
    console.log(
      "\nWARN: DoD parcial OK; preencha WHATSAPP_* reais para DoD completo (docs/WHATSAPP-META-SANDBOX.md)"
    );
  } else {
    ok = false;
  }

  if (!envOk) {
    console.log(
      "WARN: WHATSAPP_* ausentes ou inválidos em .env.local — Fase 4 HTTP E2E bloqueada"
    );
  }

  const lastGuard = join(ROOT, "reports/enterprise-guard-last.txt");
  if (existsSync(lastGuard)) {
    console.log(`\nOK: último guard registrado (${lastGuard})`);
  } else {
    console.log("\nWARN: reports/enterprise-guard-last.txt ausente");
  }

  if (!ok) {
    process.exit(1);
  }

  console.log("\nProntidão enterprise: OK (ops + evidências parciais ou completas).");
}

main();
