import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "public", "docs");
const requiredDocs = ["modelo-proposta.docx"];
const allowedExtensions = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv"]);
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!fs.existsSync(docsDir)) {
  fail("Diretorio public/docs nao encontrado.");
} else {
  const entries = fs.readdirSync(docsDir, { withFileTypes: true });

  for (const doc of requiredDocs) {
    if (!fs.existsSync(path.join(docsDir, doc))) {
      fail(`Documento obrigatorio ausente: ${doc}`);
    }
  }

  for (const entry of entries) {
    if (!entry.isFile()) {
      fail(`Entrada inesperada em public/docs: ${entry.name}`);
      continue;
    }

    const fullPath = path.join(docsDir, entry.name);
    const extension = path.extname(entry.name).toLowerCase();
    const stats = fs.statSync(fullPath);

    if (!allowedExtensions.has(extension)) {
      fail(`Extensao documental nao permitida: ${entry.name}`);
    }

    if (stats.size === 0) {
      fail(`Arquivo documental vazio: ${entry.name}`);
    }

    if (!/^[a-z0-9._-]+$/i.test(entry.name)) {
      fail(`Nome de anexo contem caracteres inseguros: ${entry.name}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Falhas na auditoria de anexos:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Auditoria de anexos concluida sem falhas.");
