import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const docsDir = path.join(projectRoot, "public", "docs");
const allowedExtensions = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
]);
const errors = [];
const warnings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath;
  });
}

const files = walk(docsDir);

for (const file of files) {
  const relative = path.relative(projectRoot, file);
  const extension = path.extname(file).toLowerCase();
  const stat = fs.statSync(file);

  if (!allowedExtensions.has(extension)) {
    errors.push(`${relative}: extensao nao permitida (${extension || "sem extensao"})`);
  }

  if (stat.size === 0) {
    warnings.push(`${relative}: arquivo vazio/placeholder`);
  }
}

console.log(`Anexos documentais verificados: ${files.length}`);

if (!fs.existsSync(docsDir)) {
  warnings.push("public/docs ainda nao existe; nenhuma anexo documental local foi auditado.");
}

for (const warning of warnings) console.warn(`WARN ${warning}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`ERRO ${error}`);
  process.exit(1);
}
