import fs from "node:fs";

const source = fs.readFileSync("app/propostas/page.tsx", "utf8");

const checks = [
  ["upload para bucket propostas", ".from(\"propostas\")"],
  ["normalizacao de nome de arquivo", ".normalize(\"NFD\")"],
  ["PDF de proposta", "setArquivo"],
  ["PDF de estatuto", "setEstatuto"],
  ["PDF de CNPJ", "setCnpjArquivo"],
  ["persistencia de arquivo_url", "arquivo_url"],
  ["persistencia de estatuto_url", "estatuto_url"],
  ["persistencia de cnpj_url", "cnpj_url"],
];

const failures = checks
  .filter(([, marker]) => !source.includes(marker))
  .map(([label]) => label);

if (failures.length > 0) {
  throw new Error(`Verificacao de anexos da proposta falhou: ${failures.join(", ")}`);
}

console.log("Verificacao local de anexos de propostas concluida.");
