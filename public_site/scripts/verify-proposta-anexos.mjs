import fs from "node:fs";
import path from "node:path";

const propostasPage = path.resolve("app", "propostas", "page.tsx");
const adminPropostasPage = path.resolve("app", "admin", "propostas", "page.tsx");

const checks = [
  {
    file: propostasPage,
    label: "formulario publico",
    required: [
      'accept="application/pdf"',
      '.from("propostas")',
      ".upload(path, file",
      "arquivo_url",
      "estatuto_url",
      "cnpj_url",
    ],
  },
  {
    file: adminPropostasPage,
    label: "admin propostas",
    required: [
      "arquivo_url",
      "estatuto_url",
      "cnpj_url",
      "storage/v1/object/public",
    ],
  },
];

const failures = [];

for (const check of checks) {
  if (!fs.existsSync(check.file)) {
    failures.push(`${check.label}: arquivo nao encontrado (${check.file})`);
    continue;
  }

  const content = fs.readFileSync(check.file, "utf8");
  for (const token of check.required) {
    if (!content.includes(token)) {
      failures.push(`${check.label}: marcador obrigatorio ausente: ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[verify:proposta-anexos] falhas encontradas:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[verify:proposta-anexos] OK.");
