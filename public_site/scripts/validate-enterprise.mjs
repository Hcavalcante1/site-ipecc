import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "docs/enterprise/ROADMAP.md",
  "docs/enterprise/RUNBOOK_LOCAL_STAGING.md",
  "scripts/audit-anexos.mjs",
  "scripts/verify-proposta-anexos.mjs",
];

const requiredScripts = [
  "build",
  "typecheck",
  "validar:enterprise",
  "audit:anexos",
  "verify:proposta-anexos",
];

const failures = [];
const warnings = [];

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    failures.push(`${relativePath}: JSON invalido (${error.message})`);
    return null;
  }
}

function assertFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Arquivo obrigatorio ausente: ${relativePath}`);
  }
}

const pkg = readJson("package.json");
if (pkg) {
  for (const script of requiredScripts) {
    if (!pkg.scripts?.[script]) {
      failures.push(`Script npm ausente: ${script}`);
    }
  }
}

for (const file of requiredFiles) {
  assertFile(file);
}

const nextConfigPath = path.join(root, "next.config.js");
const nextConfig = fs.existsSync(nextConfigPath)
  ? fs.readFileSync(nextConfigPath, "utf8")
  : "";

if (!nextConfig.includes("reactStrictMode: true")) {
  warnings.push("next.config.js sem reactStrictMode: true");
}

const envFiles = [".env", ".env.local", ".env.production"];
for (const envFile of envFiles) {
  if (fs.existsSync(path.join(root, envFile))) {
    warnings.push(`${envFile} existe localmente; nao versionar nem expor chaves reais.`);
  }
}

console.log("== Validacao enterprise local/staging ==");
for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`ERRO: ${failure}`);
  }
  process.exit(1);
}

console.log("OK: trilha enterprise minima preservada.");
