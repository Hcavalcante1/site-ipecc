import { execFileSync } from "node:child_process";

const run = (command, args) => {
  console.log(`\n> ${command} ${args.join(" ")}`);
  execFileSync(command, args, { stdio: "inherit" });
};

const read = (command, args) =>
  execFileSync(command, args, { encoding: "utf8" }).trim();

const requiredScripts = [
  "build",
  "typecheck",
  "validar:enterprise",
  "audit:anexos",
  "verify:proposta-anexos",
  "check:site",
  "smoke:site",
];

const pkg = JSON.parse(read("node", ["-e", "process.stdout.write(JSON.stringify(require('./package.json')))"]));
const missingScripts = requiredScripts.filter((script) => !pkg.scripts?.[script]);

if (missingScripts.length > 0) {
  throw new Error(`Scripts obrigatorios ausentes: ${missingScripts.join(", ")}`);
}

const trackedEnv = read("git", ["ls-files", ".env*", "app/admin/.env.local"])
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.endsWith(".example"));

if (trackedEnv.length > 0) {
  throw new Error(`Arquivos de ambiente rastreados: ${trackedEnv.join(", ")}`);
}

run("node", ["node_modules/typescript/bin/tsc", "--noEmit"]);
run("npm", ["audit", "--omit=dev"]);
run("node", ["scripts/audit-anexos.mjs"]);
run("node", ["scripts/verify-proposta-anexos.mjs"]);

console.log("\nValidacao enterprise local concluida.");
