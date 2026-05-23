/**
 * Pós-aplicação do SQL hardening-propostas-rls-APLICAR.sql
 * Uso: npm run validar:pos-hardening-rls
 */

import { execSync } from "child_process";

function run(label: string, cmd: string) {
  console.log(`\n> ${label}\n`);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

async function main() {
  console.log("=== Pós-hardening RLS propostas ===\n");

  run("validar:seguranca", "npm run validar:seguranca");
  run("validate:upload-proposta", "npm run validate:upload-proposta");

  console.log("\nOK: segurança + upload público validados.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
