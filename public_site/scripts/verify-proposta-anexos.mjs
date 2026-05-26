import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const propostaPage = path.join(root, "app/propostas/page.tsx");
const adminListPage = path.join(root, "app/admin/propostas/page.tsx");
const adminDetailPage = path.join(root, "app/admin/propostas/[id]/page.tsx");

const checks = [
  {
    file: propostaPage,
    label: "upload de proposta usa bucket propostas",
    test: (source) => source.includes('.from("propostas")') && source.includes(".upload("),
  },
  {
    file: propostaPage,
    label: "nome de arquivo de proposta e normalizado",
    test: (source) => source.includes("normalizarNomeArquivo") && source.includes("normalize("),
  },
  {
    file: propostaPage,
    label: "registro de proposta persiste arquivo_url",
    test: (source) => source.includes("arquivo_url") && source.includes(".insert("),
  },
  {
    file: adminListPage,
    label: "admin lista links de anexos da proposta",
    test: (source) => source.includes("arquivo_url") && source.includes("storage/v1/object/public"),
  },
  {
    file: adminDetailPage,
    label: "admin detalhe expoe anexo da proposta",
    test: (source) => source.includes("arquivo_url") && source.includes("storage/v1/object/public"),
  },
];

const failures = [];

for (const check of checks) {
  const relFile = path.relative(root, check.file);
  if (!fs.existsSync(check.file)) {
    failures.push(`${relFile}: arquivo nao encontrado`);
    continue;
  }

  const source = fs.readFileSync(check.file, "utf8");
  if (!check.test(source)) {
    failures.push(`${relFile}: ${check.label}`);
  }
}

if (failures.length) {
  console.error("Falhas na verificacao de proposta/anexos:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Verificacao de proposta/anexos concluida com sucesso.");
