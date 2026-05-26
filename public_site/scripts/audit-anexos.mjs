import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const allowedExtensions = new Set([".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".txt", ".csv", ".xlsx"]);
const publicDir = path.join(root, "public");
const appDir = path.join(root, "app");
const errors = [];
const warnings = [];

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const current = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(current, predicate);
    return predicate(current) ? [current] : [];
  });
}

for (const file of walk(path.join(publicDir, "docs"))) {
  const relative = path.relative(publicDir, file).replace(/\\/g, "/");
  const extension = path.extname(file).toLowerCase();
  const stat = fs.statSync(file);

  if (!allowedExtensions.has(extension)) {
    errors.push(`${relative}: extensão não permitida (${extension || "sem extensão"})`);
  }

  if (stat.size === 0) {
    warnings.push(`${relative}: arquivo vazio`);
  }
}

const sourceFiles = walk(appDir, (file) => /\.(tsx?|jsx?)$/.test(file));
const linkedDocs = new Set();
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/["'`]\/docs\/([^"'`?#]+)[^"'`]*["'`]/g)) {
    linkedDocs.add(match[1]);
  }
}

for (const doc of linkedDocs) {
  const target = path.join(publicDir, "docs", doc);
  if (!fs.existsSync(target)) {
    warnings.push(`/docs/${doc}: link público sem arquivo local em public/docs`);
  }
}

if (warnings.length > 0) {
  console.warn("Avisos de anexos:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length > 0) {
  console.error("Erros de anexos:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Auditoria de anexos concluída.");
