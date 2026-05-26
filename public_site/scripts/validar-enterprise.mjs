import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const requiredScripts = [
  "build",
  "typecheck",
  "validar:enterprise",
  "audit:anexos",
  "verify:proposta-anexos",
  "check:site",
  "smoke:site",
  "smoke:admin",
];

function run(command, args, label) {
  console.log(`\n==> ${label}`);
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function gitTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
  return output.split("\n").filter(Boolean);
}

function assertScripts() {
  const pkg = readJson("package.json");
  for (const script of requiredScripts) {
    assert(pkg.scripts?.[script], `Script obrigatorio ausente: ${script}`);
  }
}

function assertNoTrackedLocalEnvs() {
  const tracked = gitTrackedFiles();
  const blocked = tracked.filter((file) => {
    const base = path.basename(file);
    return (base === ".env" || base === ".env.local" || /^\.env\..*\.local$/.test(base)) && !file.endsWith(".example");
  });

  assert(
    blocked.length === 0,
    `Arquivos de ambiente reais rastreados pelo Git: ${blocked.join(", ")}`
  );
}

try {
  assertScripts();
  assertNoTrackedLocalEnvs();
  run("node", ["node_modules/typescript/bin/tsc", "--noEmit"], "TypeScript");
  run("npm", ["audit", "--omit=dev"], "npm audit --omit=dev");
  run("node", ["scripts/audit-anexos.mjs"], "Auditoria de anexos");
  run("node", ["scripts/verify-proposta-anexos.mjs"], "Verificacao de proposta/anexos");
  console.log("\nValidacao enterprise concluida com sucesso.");
} catch (error) {
  console.error(`\nFalha na validacao enterprise: ${error.message}`);
  process.exit(1);
}
