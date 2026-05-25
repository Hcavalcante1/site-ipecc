import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "public", "docs");
const allowedExtensions = new Set([".pdf", ".docx"]);
const failures = [];
const warnings = [];

if (!fs.existsSync(docsDir)) {
  failures.push("Diretório public/docs não encontrado.");
} else {
  const entries = fs.readdirSync(docsDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

  if (files.length === 0) {
    failures.push("Nenhum anexo documental encontrado em public/docs.");
  }

  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      failures.push(`Extensão documental não permitida: ${file}`);
    }

    if (/\s/.test(file)) {
      failures.push(`Nome de anexo com espaço: ${file}`);
    }

    const size = fs.statSync(path.join(docsDir, file)).size;
    if (size === 0) {
      warnings.push(`Anexo placeholder vazio: ${file}`);
    }
  }
}

if (failures.length > 0) {
  console.error("audit:anexos encontrou problemas:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("audit:anexos avisos:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log("audit:anexos OK");
