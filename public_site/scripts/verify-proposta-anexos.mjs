import fs from "node:fs";
import path from "node:path";

const pagePath = path.join(process.cwd(), "app", "propostas", "page.tsx");
const source = fs.readFileSync(pagePath, "utf8");

const checks = [
  ["bucket propostas", '.from("propostas")'],
  ["upload da proposta", 'uploadArquivo(arquivo, "proposta")'],
  ["upload do estatuto", 'uploadArquivo(estatuto, "estatuto")'],
  ["upload do CNPJ", 'uploadArquivo(cnpjArquivo, "cnpj")'],
  ["campo arquivo_url", "arquivo_url"],
  ["campo estatuto_url", "estatuto_url"],
  ["campo cnpj_url", "cnpj_url"],
  ["aceite PDF", 'accept="application/pdf"'],
];

const missing = checks.filter(([, needle]) => !source.includes(needle));

if (missing.length > 0) {
  for (const [label] of missing) console.error(`ERRO proposta/anexos sem verificacao: ${label}`);
  process.exit(1);
}

console.log("Fluxo local de proposta/anexos verificado.");
