/**
 * Gate consolidado enterprise (staging/local, read-only).
 * Uso: npm run validar:enterprise
 */

import { execSync } from "child_process";

const steps: { label: string; cmd: string; optional?: boolean }[] = [
  { label: "typecheck", cmd: "npm run typecheck" },
  { label: "validar:publico", cmd: "npm run validar:publico" },
  { label: "validar:admin", cmd: "npm run validar:admin" },
  { label: "validar:seguranca", cmd: "npm run validar:seguranca" },
  { label: "validar:release-prep", cmd: "npm run validar:release-prep" },
  { label: "validar:pre-m4-corte", cmd: "npm run validar:pre-m4-corte" },
  { label: "correlacionar:orfaos-logs", cmd: "npm run correlacionar:orfaos-logs" },
  { label: "ci:local", cmd: "npm run ci:local", optional: true },
];

function runStep(label: string, cmd: string): boolean {
  console.log(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("=== Validação enterprise (staging) ===\n");
  console.log("Docs: docs/ENTERPRISE-STATUS.md\n");

  const falhas: string[] = [];
  const avisos: string[] = [];

  for (const step of steps) {
    const ok = runStep(step.label, step.cmd);
    if (!ok) {
      if (step.optional) avisos.push(step.label);
      else falhas.push(step.label);
    }
  }

  console.log("\n=== Resumo ===");
  if (falhas.length === 0) {
    console.log("OK: gate enterprise passou.");
    if (avisos.length) console.log("Avisos (opcionais):", avisos.join(", "));
    return;
  }

  console.error("Falhas:", falhas.join(", "));
  if (falhas.includes("validar:seguranca")) {
    console.error(
      "→ Aplicar docs/sql/hardening-propostas-rls-APLICAR.sql no Supabase staging"
    );
    console.error("→ Depois: npm run validar:pos-hardening-rls");
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
