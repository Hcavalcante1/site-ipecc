import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/propostas/page.tsx",
  "app/admin/propostas/page.tsx",
  "app/admin/propostas/[id]/page.tsx",
];

const requiredColumns = ["arquivo_url", "estatuto_url", "cnpj_url"];
const requiredLabels = [
  "Proposta (PDF)",
  "Estatuto Social (PDF)",
  "CNPJ (PDF)",
  "Baixar Proposta",
  "Baixar Estatuto Social",
  "Baixar Cartão CNPJ",
];

const errors = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Arquivo obrigatorio ausente: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

const sources = Object.fromEntries(
  requiredFiles.map((file) => [file, read(file)])
);

const publicForm = sources["app/propostas/page.tsx"];
const adminList = sources["app/admin/propostas/page.tsx"];
const adminDetail = sources["app/admin/propostas/[id]/page.tsx"];
const combined = `${publicForm}\n${adminList}\n${adminDetail}`;

for (const column of requiredColumns) {
  if (!publicForm.includes(column)) {
    errors.push(`Formulario publico nao persiste ${column}.`);
  }

  if (!adminList.includes(column)) {
    errors.push(`Lista admin nao expoe ${column}.`);
  }

  if (!adminDetail.includes(column)) {
    errors.push(`Detalhe admin nao expoe ${column}.`);
  }
}

for (const label of requiredLabels) {
  if (!combined.includes(label)) {
    errors.push(`Rotulo esperado ausente: ${label}.`);
  }
}

if (!publicForm.includes('.from("propostas")') || !publicForm.includes(".upload(path, file")) {
  errors.push("Upload de anexos deve usar o bucket propostas com path controlado.");
}

if (!publicForm.includes('accept="application/pdf"')) {
  errors.push("Inputs de anexos devem restringir PDF via accept=\"application/pdf\".");
}

if (!combined.includes("/storage/v1/object/public/")) {
  errors.push("Admin deve montar URLs publicas do Supabase Storage para download.");
}

if (errors.length > 0) {
  console.error("\nFalha na verificacao de proposta/anexos:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Verificacao de proposta/anexos concluida sem problemas.");
