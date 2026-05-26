import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function run(command, args) {
  console.log(`\n> ${[command, ...args].join(" ")}`);
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function listTrackedEnvFiles() {
  const output = execFileSync("git", ["ls-files", "--", ".env*", "app/admin/.env*"], {
    cwd: root,
    encoding: "utf8",
  });

  return output
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !item.endsWith(".example"));
}

const requiredScripts = [
  "build",
  "typecheck",
  "validar:enterprise",
  "audit:anexos",
  "verify:proposta-anexos",
  "check:site",
  "smoke:site",
];

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script]);

if (missingScripts.length > 0) {
  console.error(`Missing required scripts: ${missingScripts.join(", ")}`);
  process.exit(1);
}

for (const file of ["ROADMAP_ENTERPRISE.md", "RUNBOOK_ENTERPRISE.md", ".env.local.example"]) {
  if (!existsSync(path.join(root, file))) {
    console.error(`Missing enterprise file: ${file}`);
    process.exit(1);
  }
}

const trackedEnvFiles = listTrackedEnvFiles();
if (trackedEnvFiles.length > 0) {
  console.error("Tracked real environment files are not allowed:");
  for (const file of trackedEnvFiles) console.error(`- ${file}`);
  process.exit(1);
}

run("npm", ["run", "typecheck"]);
run("npm", ["audit", "--omit=dev"]);
run("npm", ["run", "audit:anexos"]);
run("npm", ["run", "verify:proposta-anexos"]);

console.log("\nEnterprise validation passed.");
