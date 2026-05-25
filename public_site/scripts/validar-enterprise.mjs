import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [];

function addCheck(name, passed, detail) {
  checks.push({ name, passed, detail });
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "out", ".git"].includes(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

const packageJson = readJson("package.json");
const scripts = packageJson.scripts || {};

addCheck("script build configurado", scripts.build === "next build", "package.json");
addCheck("script typecheck configurado", scripts.typecheck === "tsc --noEmit", "package.json");
addCheck("script validar:enterprise configurado", scripts["validar:enterprise"] === "node scripts/validar-enterprise.mjs", "package.json");

const requiredDocs = [
  "docs/enterprise-roadmap.md",
  "docs/runbooks/local-staging.md",
  "docs/checklists/batch-validation.md",
];

for (const doc of requiredDocs) {
  addCheck(`documento operacional existe: ${doc}`, exists(doc), doc);
}

const gitignore = exists(".gitignore") ? readText(".gitignore") : "";
for (const pattern of [".env.local", ".env.*.local", ".next", "out", "node_modules"]) {
  addCheck(`.gitignore cobre ${pattern}`, gitignore.includes(pattern), ".gitignore");
}

const requiredRoutes = [
  "app/page.tsx",
  "app/quem-somos/page.tsx",
  "app/projetos/page.tsx",
  "app/editais/page.tsx",
  "app/propostas/page.tsx",
  "app/transparencia/page.tsx",
  "app/contato/page.tsx",
  "app/admin/page.tsx",
  "app/admin/propostas/page.tsx",
];

for (const route of requiredRoutes) {
  addCheck(`rota essencial existe: ${route}`, exists(route), route);
}

const nextConfig = exists("next.config.js") ? readText("next.config.js") : "";
addCheck("React strict mode permanece ativo", nextConfig.includes("reactStrictMode: true"), "next.config.js");

const sqlFiles = walk(root).filter((file) => file.endsWith(".sql"));
const destructiveSql = sqlFiles.filter((file) => /\b(drop|truncate)\b/i.test(readText(path.relative(root, file))));
addCheck(
  "nenhum SQL destrutivo versionado",
  destructiveSql.length === 0,
  destructiveSql.length ? destructiveSql.map((file) => path.relative(root, file)).join(", ") : "sem ocorrencias",
);

const failed = checks.filter((check) => !check.passed);

console.log("\n========== VALIDACAO ENTERPRISE LOCAL ==========");
for (const check of checks) {
  console.log(`${check.passed ? "OK" : "FALHA"} - ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
}

if (failed.length) {
  console.error(`\nFalhas encontradas: ${failed.length}`);
  process.exit(1);
}

console.log("\nValidacao enterprise concluida sem falhas.");
