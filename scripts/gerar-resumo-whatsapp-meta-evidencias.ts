/**
 * Gera resumo markdown a partir dos artefatos de evidência WhatsApp Meta.
 * Uso:
 *   npx --yes tsx scripts/gerar-resumo-whatsapp-meta-evidencias.ts
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

type CheckResult = {
  file: string;
  exists: boolean;
  okLines: string[];
  failLines: string[];
};

const ROOT = join(__dirname, "..");
const REPORTS = [
  "reports/whatsapp-meta.txt",
  "reports/whatsapp-webhook.txt",
  "reports/whatsapp-webhook-http.txt",
  "reports/whatsapp-handoff-fase4.txt",
];

function collect(file: string): CheckResult {
  const abs = join(ROOT, file);
  if (!existsSync(abs)) {
    return { file, exists: false, okLines: [], failLines: [] };
  }
  const src = readFileSync(abs, "utf8");
  const lines = src.split(/\r?\n/);
  const okLines = lines.filter((l) => l.includes("OK:")).map((l) => l.trim());
  const failLines = lines
    .filter((l) => !l.trimStart().startsWith("OK:"))
    .filter((l) => /\bFALHA\b|\bERROR\b|\bSKIP\b/i.test(l))
    .map((l) => l.trim());
  return { file, exists: true, okLines, failLines };
}

function main() {
  const now = new Date().toISOString();
  const results = REPORTS.map(collect);

  console.log("## Evidências Fase 4 — WhatsApp Meta (resumo automático)");
  console.log("");
  console.log(`- Data/hora (UTC): ${now}`);
  console.log("- Operador: (preencher)");
  console.log("- Branch/HEAD: (preencher)");
  console.log("");

  for (const r of results) {
    console.log(`### ${r.file}`);
    if (!r.exists) {
      console.log("- Status: ARQUIVO NÃO ENCONTRADO");
      console.log("");
      continue;
    }
    console.log(`- OK: ${r.okLines.length}`);
    console.log(`- Alertas/Falhas: ${r.failLines.length}`);
    if (r.okLines.length) {
      console.log("- Linhas OK:");
      for (const line of r.okLines) {
        console.log(`  - ${line}`);
      }
    }
    if (r.failLines.length) {
      console.log("- Linhas de atenção:");
      for (const line of r.failLines) {
        console.log(`  - ${line}`);
      }
    }
    console.log("");
  }
}

main();
