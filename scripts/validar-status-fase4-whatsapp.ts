/**
 * Valida se os marcadores automáticos da Fase 4 existem no ENTERPRISE-STATUS.
 * Uso:
 *   npm run validar:status-fase4-whatsapp
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const STATUS_PATH = join(process.cwd(), "docs/ENTERPRISE-STATUS.md");
const START = "<!-- FASE4_STATUS_AUTO_START -->";
const END = "<!-- FASE4_STATUS_AUTO_END -->";

function fail(msg: string): never {
  console.error(`FALHA: ${msg}`);
  process.exit(1);
}

function ok(msg: string) {
  console.log(`OK: ${msg}`);
}

function main() {
  if (!existsSync(STATUS_PATH)) {
    fail("docs/ENTERPRISE-STATUS.md não encontrado");
  }
  ok("arquivo docs/ENTERPRISE-STATUS.md presente");

  const src = readFileSync(STATUS_PATH, "utf8");
  const start = src.indexOf(START);
  const end = src.indexOf(END);

  if (start < 0) fail(`marcador ausente: ${START}`);
  if (end < 0) fail(`marcador ausente: ${END}`);
  if (end <= start) fail("ordem inválida dos marcadores automáticos");

  ok("marcadores automáticos da Fase 4 válidos");
}

main();
