import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const requiredScripts = [
  "typecheck",
  "validar:enterprise",
  "audit:anexos",
  "verify:proposta-anexos",
  "check:site",
  "smoke:site",
  "smoke:admin",
  "health:local",
];

const missingScripts = requiredScripts.filter((script) => !pkg.scripts?.[script]);
if (missingScripts.length > 0) {
  console.error(`ERRO scripts obrigatorios ausentes: ${missingScripts.join(", ")}`);
  process.exit(1);
}

const trackedEnv = execFileSync("git", ["ls-files", "--", ".env*", "app/admin/.env*"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.endsWith(".example"));

if (trackedEnv.length > 0) {
  console.error(`ERRO env real versionado: ${trackedEnv.join(", ")}`);
  process.exit(1);
}

const run = (command, args) => {
  console.log(`\n> ${command} ${args.join(" ")}`);
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
};

run("npm", ["run", "typecheck"]);
run("npm", ["audit", "--omit=dev"]);
run("npm", ["run", "audit:anexos"]);
run("npm", ["run", "verify:proposta-anexos"]);

console.log("\nValidacao enterprise local concluida.");
