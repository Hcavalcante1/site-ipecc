import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const appDir = path.join(rootDir, "app");
const docsDir = path.join(rootDir, "public", "docs");
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ignoredDirs = new Set(["node_modules", ".next", "out"]);

const errors = [];
const warnings = [];
const strictPlaceholders = process.env.STRICT_ANEXOS === "1";

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirs.has(entry.name) ? [] : walk(fullPath);
    }

    return allowedExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function assertPublicDocs() {
  if (!fs.existsSync(docsDir)) {
    errors.push("Diretorio public/docs nao encontrado.");
    return;
  }

  const docs = fs.readdirSync(docsDir).filter((name) => !name.startsWith("."));
  if (docs.length === 0) {
    errors.push("Diretorio public/docs esta vazio.");
  }

  for (const doc of docs) {
    const fullPath = path.join(docsDir, doc);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;
    if (stat.size === 0) {
      const message = `Documento vazio em public/docs/${doc}.`;
      if (strictPlaceholders) errors.push(message);
      else warnings.push(message);
    }
  }
}

function assertLinkedDocsExist() {
  const files = walk(appDir);
  const docLinkPattern = /(?:href|src)\s*=\s*["'](\/docs\/[^"']+)["']/g;

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(docLinkPattern)) {
      const publicPath = decodeURI(match[1].split(/[?#]/)[0]);
      const fullPath = path.join(rootDir, "public", publicPath);

      if (!fs.existsSync(fullPath)) {
        errors.push(
          `${path.relative(rootDir, file)} referencia documento inexistente: ${publicPath}`
        );
      }
    }
  }
}

assertPublicDocs();
assertLinkedDocsExist();

if (errors.length > 0) {
  console.error("Falha na auditoria de anexos/documentos:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("Avisos da auditoria de anexos/documentos:");
  for (const warning of warnings) console.warn(`- ${warning}`);
  console.warn("Use STRICT_ANEXOS=1 para bloquear placeholders vazios.");
}

console.log("Auditoria de anexos/documentos concluida sem erros duros.");
