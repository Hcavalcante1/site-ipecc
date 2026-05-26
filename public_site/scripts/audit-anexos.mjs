import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const docsDir = path.join(process.cwd(), "public", "docs");
const requiredDocs = [
  "estatuto-social.pdf",
  "cnpj-cartao.pdf",
  "politica-lgpd.pdf",
  "modelo-proposta.docx",
  "checklist-fornecedor.pdf",
];

const allowedExtensions = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv"]);
const files = await readdir(docsDir);
const errors = [];
const warnings = [];

for (const requiredDoc of requiredDocs) {
  if (!files.includes(requiredDoc)) {
    errors.push(`Missing required document: public/docs/${requiredDoc}`);
  }
}

for (const file of files) {
  const fullPath = path.join(docsDir, file);
  const info = await stat(fullPath);
  const ext = path.extname(file).toLowerCase();

  if (!info.isFile()) continue;
  if (!allowedExtensions.has(ext)) {
    errors.push(`Unsupported document extension: public/docs/${file}`);
  }
  if (info.size === 0) {
    warnings.push(`Placeholder/empty document file: public/docs/${file}`);
  }
}

if (errors.length > 0) {
  console.error("Attachment/document audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("Attachment/document audit warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log(`Attachment/document audit passed (${files.length} files).`);
