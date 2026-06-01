/**
 * Marca checkboxes manuais da Fase 4 em ENTERPRISE-STATUS.md com base nos reports.
 * Uso: npm run sincronizar:checklist-fase4-status
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const STATUS = join(ROOT, "docs/ENTERPRISE-STATUS.md");

type Item = {
  needle: string;
  report: string;
  required: string[];
};

const ITEMS: Item[] = [
  {
    needle: "npm run validar:whatsapp-meta",
    report: "reports/whatsapp-meta.txt",
    required: [
      "OK: subscribe válido retorna challenge",
      "OK: token errado → forbidden",
      "OK: sem WHATSAPP_VERIFY_TOKEN → missing_config",
    ],
  },
  {
    needle: "npm run validar:whatsapp-webhook",
    report: "reports/whatsapp-webhook.txt",
    required: [
      "OK: 503 sem WHATSAPP_APP_SECRET",
      "OK: idempotência no mesmo messageId",
    ],
  },
  {
    needle: "npm run validar:whatsapp-webhook-http",
    report: "reports/whatsapp-webhook-http.txt",
    required: [
      "OK: GET handshake Meta (HTTP 200 + challenge)",
      "OK: corpo JSON com processed=1",
    ],
  },
  {
    needle: "npm run validar:whatsapp-handoff-fase4",
    report: "reports/whatsapp-handoff-fase4.txt",
    required: ["OK: handoff acionado pela opção 6"],
  },
  {
    needle: "Artefatos salvos em `reports/`",
    report: "reports/whatsapp-meta.txt",
    required: ["OK: subscribe válido retorna challenge"],
  },
];

function reportOk(item: Item): boolean {
  const abs = join(ROOT, item.report);
  if (!existsSync(abs)) return false;
  const src = readFileSync(abs, "utf8");
  return item.required.every((s) => src.includes(s));
}

function tickLine(line: string, done: boolean): string {
  if (!done) return line;
  if (line.includes("- [x]")) return line;
  return line.replace("- [ ]", "- [x]");
}

function main() {
  if (!existsSync(STATUS)) {
    console.error("FALHA: docs/ENTERPRISE-STATUS.md ausente");
    process.exit(1);
  }

  let src = readFileSync(STATUS, "utf8");
  const lines = src.split(/\r?\n/);
  let changed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("- [ ]") && !line.includes("- [x]")) continue;

    for (const item of ITEMS) {
      if (!line.includes(item.needle)) continue;
      const done = reportOk(item);
      const next = tickLine(line, done);
      if (next !== line) {
        lines[i] = next;
        changed++;
        console.log(done ? `OK: marcado — ${item.needle}` : `— pendente — ${item.needle}`);
      }
    }
  }

  if (changed === 0) {
    console.log("Nenhum checkbox alterado (já sincronizado ou reports incompletos).");
    return;
  }

  writeFileSync(STATUS, lines.join("\n"), "utf8");
  console.log(`\n${changed} checkbox(es) atualizado(s) em docs/ENTERPRISE-STATUS.md`);
}

main();
