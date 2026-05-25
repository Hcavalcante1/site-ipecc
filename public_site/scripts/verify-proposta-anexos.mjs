import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const propostaPage = path.join(root, "app/propostas/page.tsx");
const adminListPage = path.join(root, "app/admin/propostas/page.tsx");

const failures = [];

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Arquivo ausente: ${path.relative(root, filePath)}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

const proposta = read(propostaPage);
const adminList = read(adminListPage);

const expectedUploadLabels = [
  "Proposta (PDF)",
  "Estatuto Social (PDF)",
  "CNPJ (PDF)",
];

for (const label of expectedUploadLabels) {
  if (!proposta.includes(label)) {
    failures.push(`Formulario de proposta sem area de anexo: ${label}`);
  }
}

const expectedPersistedUrls = [
  "arquivo_url",
  "estatuto_url",
  "cnpj_url",
];

for (const field of expectedPersistedUrls) {
  if (!proposta.includes(field)) {
    failures.push(`Formulario de proposta nao persiste campo: ${field}`);
  }
  if (!adminList.includes(field)) {
    failures.push(`Admin de propostas nao exibe campo: ${field}`);
  }
}

if (!proposta.includes("accept=\"application/pdf\"")) {
  failures.push("Formulario de proposta deve restringir anexos principais a PDF.");
}

console.log("== Verificacao de anexos de propostas ==");

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`ERRO: ${failure}`);
  }
  process.exit(1);
}

console.log("OK: formulario e admin preservam anexos obrigatorios de propostas.");
