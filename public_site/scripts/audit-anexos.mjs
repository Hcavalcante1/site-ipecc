import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "app");
const errors = [];
const warnings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function publicAssetExists(href) {
  const cleanHref = href.split("#")[0].split("?")[0];
  return fs.existsSync(path.join(root, "public", cleanHref.replace(/^\//, "")));
}

for (const file of walk(appDir)) {
  const source = fs.readFileSync(file, "utf8");
  const relativeFile = path.relative(root, file);
  const refs = [...source.matchAll(/(?:href|src)=["'](\/(?:docs|media)\/[^"']+)["']/g)];

  for (const [, ref] of refs) {
    if (!publicAssetExists(ref)) {
      warnings.push(`${relativeFile}: referencia local ausente em public${ref}`);
    }
  }
}

const propostaSource = fs.readFileSync(path.join(root, "app/propostas/page.tsx"), "utf8");
for (const unsafePattern of [/upsert:\s*true/, /\.remove\(/, /\.emptyBucket\(/]) {
  if (unsafePattern.test(propostaSource)) {
    errors.push(`Padrao de storage inseguro encontrado em app/propostas/page.tsx: ${unsafePattern}`);
  }
}

if (!propostaSource.includes('return `propostas/${path}`;')) {
  errors.push("Formulario de propostas deve salvar caminho com prefixo do bucket propostas.");
}

if (warnings.length > 0) {
  console.warn("\nAvisos de anexos/documentos:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length > 0) {
  console.error("\nFalha na auditoria de anexos:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Auditoria de anexos concluida sem bloqueios.");
