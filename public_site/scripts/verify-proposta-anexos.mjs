import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "public", "docs");
const modeloProposta = path.join(docsDir, "modelo-proposta.docx");

const errors = [];

if (!fs.existsSync(modeloProposta)) {
  errors.push("Modelo de proposta ausente em public/docs/modelo-proposta.docx.");
} else {
  const stats = fs.statSync(modeloProposta);
  if (stats.size === 0) {
    errors.push("Modelo de proposta esta vazio.");
  }
}

if (errors.length > 0) {
  console.error("Falhas na verificacao de anexos de proposta:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Verificacao de anexos de proposta concluida sem falhas.");
