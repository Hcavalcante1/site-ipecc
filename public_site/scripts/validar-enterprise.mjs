import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredScripts = [
  "build",
  "typecheck",
  "validar:enterprise",
  "audit:anexos",
  "verify:proposta-anexos",
  "health:local",
  "smoke:site",
  "smoke:admin",
];

function run(command, args) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function assertRequiredScripts() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const missing = requiredScripts.filter((script) => !packageJson.scripts?.[script]);

  if (missing.length > 0) {
    throw new Error(`Scripts enterprise ausentes: ${missing.join(", ")}`);
  }
}

function assertNoTrackedRealEnv() {
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, "/"));

  const forbidden = tracked.filter((file) => {
    const name = path.posix.basename(file);
    return name.startsWith(".env") && !name.endsWith(".example");
  });

  if (forbidden.length > 0) {
    throw new Error(`Arquivos de ambiente reais versionados: ${forbidden.join(", ")}`);
  }
}

try {
  console.log("== Validação enterprise local ==");
  assertRequiredScripts();
  assertNoTrackedRealEnv();
  run("npm", ["run", "typecheck"]);
  run("npm", ["audit", "--omit=dev", "--audit-level=high"]);
  run("npm", ["run", "verify:proposta-anexos"]);
  console.log("\nValidação enterprise concluída.");
} catch (error) {
  console.error(`\nFalha na validação enterprise: ${error.message}`);
  process.exit(1);
}
