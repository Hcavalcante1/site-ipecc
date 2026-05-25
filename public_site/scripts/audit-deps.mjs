import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

const output = result.stdout || result.stderr;
let report;

try {
  report = JSON.parse(output);
} catch {
  console.error("Nao foi possivel interpretar o resultado do npm audit.");
  if (output) console.error(output);
  process.exit(1);
}

const vulnerabilities = Object.values(report.vulnerabilities || {});
const actionable = vulnerabilities.filter((item) => {
  const fix = item.fixAvailable;
  return fix && typeof fix === "object" && fix.isSemVerMajor === false;
});
const majorOnly = vulnerabilities.filter((item) => {
  const fix = item.fixAvailable;
  return fix && typeof fix === "object" && fix.isSemVerMajor === true;
});

if (actionable.length > 0) {
  console.error("audit:deps encontrou correcoes seguras pendentes:");
  for (const item of actionable) {
    console.error(`- ${item.name}: ${item.severity} -> ${item.fixAvailable.name}@${item.fixAvailable.version}`);
  }
  process.exit(1);
}

if (majorOnly.length > 0) {
  console.warn("audit:deps avisos de upgrade major requerido:");
  for (const item of majorOnly) {
    console.warn(`- ${item.name}: ${item.severity} -> ${item.fixAvailable.name}@${item.fixAvailable.version}`);
  }
}

const totals = report.metadata?.vulnerabilities;
if (totals) {
  console.log(
    `audit:deps resumo: ${totals.total} vulnerabilidades (${totals.moderate} moderate, ${totals.high} high, ${totals.critical} critical)`
  );
}

console.log("audit:deps OK");
