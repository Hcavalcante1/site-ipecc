import fs from "node:fs";
import path from "node:path";

const pagePath = path.join(process.cwd(), "app", "propostas", "page.tsx");
const source = fs.readFileSync(pagePath, "utf8");
const requiredSnippets = [
  {
    label: "upload para bucket propostas",
    pattern: /\.from\(["']propostas["']\)/,
  },
  {
    label: "aceite restrito a PDF",
    pattern: /accept=["']application\/pdf["']/,
  },
  {
    label: "normalização de nome de arquivo",
    pattern: /\.normalize\(["']NFD["']\)/,
  },
  {
    label: "anexo de proposta",
    pattern: /arquivo_url/,
  },
  {
    label: "anexo de estatuto",
    pattern: /estatuto_url/,
  },
  {
    label: "anexo de CNPJ",
    pattern: /cnpj_url/,
  },
];

const missing = requiredSnippets.filter(({ pattern }) => !pattern.test(source));

if (missing.length > 0) {
  console.error("Verificação de anexos de proposta falhou:");
  for (const item of missing) console.error(`- ${item.label}`);
  process.exit(1);
}

console.log("Verificação de anexos de proposta concluída.");
