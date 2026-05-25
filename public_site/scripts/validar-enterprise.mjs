import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "app");
const publicDir = path.join(root, "public");

const requiredFiles = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "app/admin/page.tsx",
  "scripts/check-site.mjs",
  "scripts/audit-anexos.mjs",
  "scripts/verify-proposta-anexos.mjs",
];

const requiredRoutes = [
  "/",
  "/quem-somos",
  "/projetos",
  "/acoes",
  "/editais",
  "/transparencia",
  "/contato",
  "/propostas",
  "/login",
  "/admin",
];

const errors = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function routeToPage(route) {
  if (route === "/") return path.join(appDir, "page.tsx");
  return path.join(appDir, route.replace(/^\//, ""), "page.tsx");
}

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Arquivo obrigatório ausente: ${file}`);
}

for (const route of requiredRoutes) {
  if (!fs.existsSync(routeToPage(route))) {
    errors.push(`Rota obrigatória sem page.tsx: ${route}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const script of ["build", "validar:enterprise", "audit:anexos", "verify:proposta-anexos", "smoke:site"]) {
  if (!packageJson.scripts?.[script]) errors.push(`Script obrigatório ausente: ${script}`);
}

const publicMedia = path.join(publicDir, "media");
if (!fs.existsSync(publicMedia)) {
  warnings.push("Diretório public/media ausente; páginas públicas devem usar fallbacks visuais.");
}

const envExample = path.join(root, ".env.local.example");
if (!fs.existsSync(envExample)) {
  warnings.push(".env.local.example ausente; documente variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

console.log("Enterprise validation");
console.log(`Root: ${root}`);
if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error("\nErrors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: estrutura mínima enterprise válida.");
