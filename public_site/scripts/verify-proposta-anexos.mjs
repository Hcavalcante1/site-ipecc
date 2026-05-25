import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicPage = path.join(root, "app", "propostas", "page.tsx");
const adminPage = path.join(root, "app", "admin", "propostas", "page.tsx");

const expectedPublicFields = ["arquivo", "estatuto", "cnpjArquivo"];
const expectedDbColumns = ["arquivo_url", "estatuto_url", "cnpj_url"];
const expectedLabels = ["Proposta (PDF)", "Estatuto Social (PDF)", "CNPJ (PDF)"];

const errors = [];

function readRequired(file) {
  if (!fs.existsSync(file)) {
    errors.push(`Arquivo ausente: ${path.relative(root, file)}`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

const publicContent = readRequired(publicPage);
const adminContent = readRequired(adminPage);

for (const field of expectedPublicFields) {
  if (!publicContent.includes(field)) errors.push(`Fluxo público sem estado/campo: ${field}`);
}

for (const column of expectedDbColumns) {
  if (!publicContent.includes(column)) errors.push(`Fluxo público não grava coluna: ${column}`);
  if (!adminContent.includes(column)) errors.push(`Admin não lista coluna: ${column}`);
}

for (const label of expectedLabels) {
  if (!publicContent.includes(label)) errors.push(`Label obrigatório ausente no formulário: ${label}`);
}

if (!/\.from\(["']propostas["']\)/.test(publicContent)) {
  errors.push("Fluxo público não usa bucket propostas.");
}

if (!/return\s+[`'"]propostas\//.test(publicContent)) {
  errors.push("Fluxo público deve persistir URLs com prefixo do bucket propostas/.");
}

console.log("Verify proposta anexos");
console.log(`Public page: ${path.relative(root, publicPage)}`);
console.log(`Admin page: ${path.relative(root, adminPage)}`);

if (errors.length) {
  console.error("\nErrors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: proposta/anexos coerentes entre envio e admin.");
