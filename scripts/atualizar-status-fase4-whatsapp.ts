/**
 * Atualiza automaticamente o bloco de registro da Fase 4
 * em docs/ENTERPRISE-STATUS.md com base nos reports.
 *
 * Uso:
 *   npm run atualizar:status-fase4-whatsapp
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = join(__dirname, "..");
const STATUS_PATH = join(ROOT, "docs/ENTERPRISE-STATUS.md");
const START = "<!-- FASE4_STATUS_AUTO_START -->";
const END = "<!-- FASE4_STATUS_AUTO_END -->";

const FILES = [
  "reports/whatsapp-meta.txt",
  "reports/whatsapp-webhook.txt",
  "reports/whatsapp-webhook-http.txt",
  "reports/whatsapp-handoff-fase4.txt",
];

function getHead(): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT })
      .toString("utf8")
      .trim();
  } catch {
    return "desconhecido";
  }
}

function summarize(file: string): string[] {
  const abs = join(ROOT, file);
  if (!existsSync(abs)) {
    return [`- ` + "Status: ARQUIVO NÃO ENCONTRADO"];
  }
  const src = readFileSync(abs, "utf8");
  const lines = src.split(/\r?\n/);
  const ok = lines.filter((l) => l.includes("OK:")).map((l) => l.trim());
  const warn = lines
    .filter((l) => !l.trimStart().startsWith("OK:"))
    .filter((l) => /\bFALHA\b|\bERROR\b|\bSKIP\b/i.test(l))
    .map((l) => l.trim());

  const out: string[] = [];
  out.push(`- OK: ${ok.length}`);
  out.push(`- Alertas/Falhas: ${warn.length}`);
  if (ok.length > 0) {
    out.push("- Linhas OK:");
    for (const l of ok) out.push(`  - ${l}`);
  }
  if (warn.length > 0) {
    out.push("- Linhas de atenção:");
    for (const l of warn) out.push(`  - ${l}`);
  }
  return out;
}

function buildBlock() {
  const now = new Date().toISOString();
  const head = getHead();
  const body: string[] = [];
  body.push("### Registro de execução (automático)");
  body.push("");
  body.push(`- Data/hora (UTC): ${now}`);
  body.push("- Operador: (preencher)");
  body.push(`- Branch/HEAD: ${head}`);
  body.push("");

  for (const file of FILES) {
    body.push(`#### \`${file}\``);
    body.push("");
    for (const line of summarize(file)) body.push(line);
    body.push("");
  }
  return body.join("\n").trimEnd();
}

function main() {
  if (!existsSync(STATUS_PATH)) {
    console.error("FALHA: docs/ENTERPRISE-STATUS.md não encontrado");
    process.exit(1);
  }
  const src = readFileSync(STATUS_PATH, "utf8");
  const start = src.indexOf(START);
  const end = src.indexOf(END);
  if (start < 0 || end < 0 || end <= start) {
    console.error("FALHA: marcadores automáticos da Fase 4 não encontrados");
    process.exit(1);
  }
  const before = src.slice(0, start + START.length);
  const after = src.slice(end);
  const content = `\n\n${buildBlock()}\n\n`;
  writeFileSync(STATUS_PATH, `${before}${content}${after}`, "utf8");
  console.log("OK: bloco automático da Fase 4 atualizado em docs/ENTERPRISE-STATUS.md");
}

main();
