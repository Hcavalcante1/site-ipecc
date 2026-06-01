/**
 * Valida estrutura operacional enterprise (scripts, npm, marcadores de status).
 * Uso: npm run validar:enterprise-ops
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error("FALHA:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

const REQUIRED_FILES = [
  "scripts/enterprise-guard-local.ts",
  "scripts/validar-enterprise-staging.ts",
  "scripts/agendar-enterprise-guard.ps1",
  "scripts/verificar-enterprise-guard-agendamento.ps1",
  "scripts/diagnostico-enterprise-operacao.ps1",
  "scripts/coletar-evidencias-whatsapp-meta.ps1",
  "scripts/coletar-reports-whatsapp-meta.ts",
  "scripts/executar-fase4-whatsapp-meta.ps1",
  "scripts/validar-dod-whatsapp-meta.ts",
  "scripts/atualizar-status-fase4-whatsapp.ts",
  "scripts/validar-enterprise-readiness.ts",
  "scripts/sincronizar-checklist-fase4-status.ts",
  "scripts/preparar-env-whatsapp-meta.ts",
  "scripts/validar-whatsapp-meta-real-preflight.ts",
  "docs/FASE4-WHATSAPP-RUNBOOK.md",
  "docs/ENTERPRISE-GUARD-LOCAL.md",
  "docs/ENTERPRISE-OPERACAO-QUICKSTART.md",
];

const REQUIRED_NPM_SCRIPTS = [
  "guard:enterprise",
  "validar:enterprise",
  "validar:enterprise:fase4",
  "diagnostico:enterprise-operacao",
  "verificar:agendamento-enterprise-guard",
  "fase4:whatsapp-meta:full",
  "validar:status-fase4-whatsapp",
  "check:enterprise-operacao",
  "validar:enterprise-ops",
  "coletar:reports-whatsapp-meta",
  "coletar:evidencias-whatsapp-meta:parcial",
  "validar:dod-whatsapp-meta:parcial",
  "validar:enterprise-readiness",
  "fase4:whatsapp-meta:parcial",
  "sincronizar:checklist-fase4-status",
  "preparar:env-whatsapp-meta",
  "evolucao:segura",
  "evolucao:segura:http",
  "validar:whatsapp-meta-real-preflight",
];

function main() {
  for (const rel of REQUIRED_FILES) {
    assert(`arquivo ${rel}`, existsSync(join(ROOT, rel)));
  }

  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  for (const script of REQUIRED_NPM_SCRIPTS) {
    assert(`npm script ${script}`, !!pkg.scripts?.[script]);
  }

  const status = readFileSync(join(ROOT, "docs/ENTERPRISE-STATUS.md"), "utf8");
  assert(
    "marcadores FASE4 no ENTERPRISE-STATUS",
    status.includes("<!-- FASE4_STATUS_AUTO_START -->") &&
      status.includes("<!-- FASE4_STATUS_AUTO_END -->")
  );

  console.log("\nEstrutura operacional enterprise validada.");
}

main();
