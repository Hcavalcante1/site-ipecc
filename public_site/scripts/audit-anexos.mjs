import fs from "node:fs";
import path from "node:path";

const docsDir = path.resolve("public", "docs");
const allowedExtensions = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"]);

if (!fs.existsSync(docsDir)) {
  console.log("[audit:anexos] public/docs ausente; nada para auditar neste branch.");
  process.exit(0);
}

const failures = [];
const warnings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const relativePath = path.relative(process.cwd(), fullPath);
    const extension = path.extname(entry.name).toLowerCase();
    const size = fs.statSync(fullPath).size;

    if (!allowedExtensions.has(extension)) {
      failures.push(`${relativePath}: extensao nao permitida (${extension || "sem extensao"})`);
    }

    if (size === 0) {
      warnings.push(`${relativePath}: arquivo vazio`);
    }
  }
}

walk(docsDir);

for (const warning of warnings) {
  console.warn(`[audit:anexos] aviso: ${warning}`);
}

if (failures.length > 0) {
  console.error("[audit:anexos] falhas encontradas:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[audit:anexos] OK (${warnings.length} aviso(s)).`);
