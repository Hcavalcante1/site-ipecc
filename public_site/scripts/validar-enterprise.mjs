import { spawnSync } from "node:child_process";
import fs from "node:fs";

const requiredScripts = [
  "build",
  "typecheck",
  "validar:enterprise",
  "audit:anexos",
  "verify:proposta-anexos",
  "check:site",
  "smoke:site",
];

function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script]);

if (missingScripts.length > 0) {
  console.error(`Scripts obrigatorios ausentes: ${missingScripts.join(", ")}`);
  process.exit(1);
}

const trackedEnv = spawnSync("git", ["ls-files", ".env", ".env.*", "app/admin/.env", "app/admin/.env.*"], {
  cwd: process.cwd(),
  encoding: "utf8",
});

const forbiddenEnvFiles = trackedEnv.stdout
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.endsWith(".example"));

if (forbiddenEnvFiles.length > 0) {
  console.error("Arquivos reais de ambiente ainda rastreados pelo Git:");
  for (const file of forbiddenEnvFiles) console.error(`- ${file}`);
  process.exit(1);
}

run("npm", ["run", "typecheck"]);
run("npm", ["audit", "--omit=dev"]);
run("npm", ["run", "audit:anexos"]);
run("npm", ["run", "verify:proposta-anexos"]);

console.log("\nValidacao enterprise concluida.");
