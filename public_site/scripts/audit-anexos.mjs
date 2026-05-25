import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  {
    name: "propostas usam bucket publico esperado",
    file: "app/propostas/page.tsx",
    test: (src) => src.includes('.from("propostas")') && src.includes("return `propostas/${path}`"),
  },
  {
    name: "propostas gravam os tres anexos principais",
    file: "app/propostas/page.tsx",
    test: (src) => ["arquivo_url", "estatuto_url", "cnpj_url"].every((field) => src.includes(field)),
  },
  {
    name: "admin lista os tres anexos de propostas",
    file: "app/admin/propostas/page.tsx",
    test: (src) => ["arquivo_url", "estatuto_url", "cnpj_url"].every((field) => src.includes(field)),
  },
  {
    name: "detalhe admin lista os tres anexos de propostas",
    file: "app/admin/propostas/[id]/page.tsx",
    test: (src) => ["arquivo_url", "estatuto_url", "cnpj_url"].every((field) => src.includes(field)),
  },
  {
    name: "detalhe publico de edital aceita legado com prefixo editais/",
    file: "app/editais/[id]/page.tsx",
    test: (src) => src.includes("replace(/^editais\\//, \"\")"),
  },
  {
    name: "mural admin normaliza nome de PDF antes do storage",
    file: "app/admin/editais/mural/page.tsx",
    test: (src) => src.includes("normalizarNomeArquivo") && src.includes('contentType: "application/pdf"'),
  },
];

const failures = [];

for (const check of checks) {
  const source = read(check.file);
  if (!check.test(source)) failures.push(check);
}

if (failures.length > 0) {
  console.error("Falhas no audit de anexos:");
  for (const failure of failures) {
    console.error(`- ${failure.name} (${failure.file})`);
  }
  process.exit(1);
}

console.log(`Audit de anexos OK (${checks.length} invariantes).`);

