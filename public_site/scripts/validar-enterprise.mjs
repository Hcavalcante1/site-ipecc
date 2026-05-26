import { execFileSync } from "node:child_process";
import fs from "node:fs";

const requiredScripts = [
  "build",
  "typecheck",
  "validar:enterprise",
  "audit:anexos",
  "verify:proposta-anexos",
  "health:local",
  "check:site",
  "smoke:site",
  "smoke:admin",
];

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const failures = [];

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    failures.push(`script ausente: ${scriptName}`);
  }
}

const trackedFiles = execFileSync("git", ["ls-files"], {
  cwd: "..",
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

const forbiddenTrackedEnv = trackedFiles.filter((file) => {
  if (!file.startsWith("public_site/")) return false;
  if (file.endsWith(".example")) return false;
  return /(^|\/)\.env(\.|$)/.test(file);
});

if (forbiddenTrackedEnv.length > 0) {
  failures.push(`env real versionado: ${forbiddenTrackedEnv.join(", ")}`);
}

if (failures.length > 0) {
  console.error("[validar:enterprise] falhas de preflight:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const commands = [
  ["npm", ["run", "typecheck"]],
  ["npm", ["audit", "--omit=dev"]],
  ["npm", ["run", "audit:anexos"]],
  ["npm", ["run", "verify:proposta-anexos"]],
];

for (const [command, args] of commands) {
  console.log(`[validar:enterprise] executando: ${command} ${args.join(" ")}`);
  execFileSync(command, args, { stdio: "inherit" });
}

console.log("[validar:enterprise] OK.");
