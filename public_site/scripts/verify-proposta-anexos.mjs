import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const propostaPage = fs.readFileSync(path.join(root, "app/propostas/page.tsx"), "utf8");
const adminList = fs.readFileSync(path.join(root, "app/admin/propostas/page.tsx"), "utf8");
const adminDetail = fs.readFileSync(path.join(root, "app/admin/propostas/[id]/page.tsx"), "utf8");

const requiredUploads = [
  { state: "arquivo", type: "proposta", column: "arquivo_url" },
  { state: "estatuto", type: "estatuto", column: "estatuto_url" },
  { state: "cnpjArquivo", type: "cnpj", column: "cnpj_url" },
];

const failures = [];

for (const item of requiredUploads) {
  if (!propostaPage.includes(`await uploadArquivo(${item.state}, "${item.type}")`)) {
    failures.push(`upload ausente para ${item.column}`);
  }
  if (!propostaPage.includes(item.column)) {
    failures.push(`coluna ausente no insert: ${item.column}`);
  }
  if (!adminList.includes(item.column)) {
    failures.push(`listagem admin nao expõe ${item.column}`);
  }
  if (!adminDetail.includes(item.column)) {
    failures.push(`detalhe admin nao expõe ${item.column}`);
  }
}

if (!propostaPage.includes('accept="application/pdf"')) {
  failures.push("inputs de proposta devem restringir upload a PDF");
}

if (failures.length > 0) {
  console.error("Verificacao de anexos de proposta falhou:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Verificacao de anexos de proposta OK.");

