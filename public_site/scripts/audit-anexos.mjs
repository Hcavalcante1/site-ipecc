import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const allowedExtensions = new Set([
  ".csv",
  ".doc",
  ".docx",
  ".jpeg",
  ".jpg",
  ".json",
  ".pdf",
  ".png",
  ".txt",
  ".xls",
  ".xlsx",
]);
const scanDirs = ["public/docs", "public/documentos", "public/anexos"];

const errors = [];
const warnings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  });
}

for (const relDir of scanDirs) {
  const absDir = path.join(root, relDir);
  for (const file of walk(absDir)) {
    const relFile = path.relative(root, file);
    const ext = path.extname(file).toLowerCase();
    const stat = fs.statSync(file);

    if (!allowedExtensions.has(ext)) {
      errors.push(`${relFile}: extensao nao permitida (${ext || "sem extensao"})`);
    }

    if (stat.size === 0) {
      warnings.push(`${relFile}: arquivo vazio`);
    }
  }
}

if (warnings.length) {
  console.warn("Avisos da auditoria de anexos:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error("Falhas da auditoria de anexos:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Auditoria de anexos concluida sem falhas bloqueantes.");
