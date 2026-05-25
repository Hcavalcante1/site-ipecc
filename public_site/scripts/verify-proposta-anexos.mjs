import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const propostaPagePath = path.join(root, "app", "propostas", "page.tsx");
const adminListPath = path.join(root, "app", "admin", "propostas", "page.tsx");
const adminDetailPath = path.join(root, "app", "admin", "propostas", "[id]", "page.tsx");

const read = (filePath) => fs.readFileSync(filePath, "utf8");

for (const filePath of [propostaPagePath, adminListPath, adminDetailPath]) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Arquivo de propostas ausente: ${path.relative(root, filePath)}`);
  }
}

if (failures.length === 0) {
  const propostaPage = read(propostaPagePath);
  const adminList = read(adminListPath);
  const adminDetail = read(adminDetailPath);

  for (const expected of ['type="file"', ".storage", '.from("propostas")', "arquivo_url"]) {
    if (!propostaPage.includes(expected)) {
      failures.push(`Envio de propostas sem trecho esperado: ${expected}`);
    }
  }

  for (const expected of ["arquivo_url", "estatuto_url", "cnpj_url"]) {
    if (!adminList.includes(expected)) {
      failures.push(`Lista admin não referencia anexo: ${expected}`);
    }
  }

  if (!adminDetail.includes("arquivo_url")) {
    failures.push("Detalhe admin não referencia arquivo_url.");
  }
}

if (failures.length > 0) {
  console.error("verify:proposta-anexos encontrou problemas:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("verify:proposta-anexos OK");
