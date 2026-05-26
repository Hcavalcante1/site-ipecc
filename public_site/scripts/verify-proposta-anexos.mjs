import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const propostaPage = path.join(rootDir, "app", "propostas", "page.tsx");
const adminDetalhePage = path.join(rootDir, "app", "admin", "propostas", "[id]", "page.tsx");

const checks = [
  {
    file: propostaPage,
    label: "pagina publica de propostas",
    required: [
      "accept=\"application/pdf\"",
      ".from(\"propostas\")",
      ".upload(path, file, { upsert: false })",
      "arquivo_url",
      "estatuto_url",
      "cnpj_url",
      "setArquivo(null)",
      "setEstatuto(null)",
      "setCnpjArquivo(null)",
    ],
  },
  {
    file: adminDetalhePage,
    label: "detalhe admin de proposta",
    required: ["arquivo_url", "estatuto_url", "cnpj_url", "/storage/v1/object/public/"],
  },
];

const errors = [];

for (const check of checks) {
  if (!fs.existsSync(check.file)) {
    errors.push(`Arquivo ausente: ${path.relative(rootDir, check.file)}`);
    continue;
  }

  const source = fs.readFileSync(check.file, "utf8");
  for (const required of check.required) {
    if (!source.includes(required)) {
      errors.push(`${check.label} nao contem requisito: ${required}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Falha na verificacao de anexos de propostas:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Verificacao de anexos de propostas concluida sem problemas.");
