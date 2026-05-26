/**
 * Gate push prep — código e scripts (sem alterar Supabase).
 * Uso: npm run validar:push-prep
 */

import { execSync } from "child_process";

const steps: { label: string; cmd: string }[] = [
  { label: "typecheck", cmd: "npm run typecheck" },
  { label: "validar:publico", cmd: "npm run validar:publico" },
  { label: "validar:admin", cmd: "npm run validar:admin" },
  { label: "validar:whatsapp-webhook", cmd: "npm run validar:whatsapp-webhook" },
  { label: "validar:whatsapp-meta", cmd: "npm run validar:whatsapp-meta" },
  { label: "validar:whatsapp-fase2", cmd: "npm run validar:whatsapp-fase2" },
  { label: "validar:whatsapp-public-chat", cmd: "npm run validar:whatsapp-public-chat" },
];

function main() {
  console.log("=== Push prep (código) ===\n");
  console.log("Docs: docs/PUSH-PACKAGE-LOCAL.md\n");

  const falhas: string[] = [];

  for (const step of steps) {
    console.log(`\n--- ${step.label} ---\n`);
    try {
      execSync(step.cmd, { stdio: "inherit", cwd: process.cwd() });
    } catch {
      falhas.push(step.label);
    }
  }

  console.log("\n=== Resumo push prep ===");
  if (falhas.length) {
    console.error("FALHA:", falhas.join(", "));
    process.exit(1);
  }

  console.log("OK: gate push prep (código).");
  console.log(
    "Próximo: npm run auditar:cms-staging (conteúdo) e npm run validar:enterprise (completo)."
  );
  console.log("Smoke HTTP: npm run dev && npm run validar:smoke-publico");
}

main();
