import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "app/propostas/page.tsx",
  "app/admin/propostas/page.tsx",
  "app/admin/propostas/[id]/page.tsx",
];

const requiredPatterns = [
  {
    file: "app/propostas/page.tsx",
    patterns: [/arquivo/i, /storage/i, /propostas/i],
  },
  {
    file: "app/admin/propostas/page.tsx",
    patterns: [/arquivo/i, /propostas/i],
  },
  {
    file: "app/admin/propostas/[id]/page.tsx",
    patterns: [/arquivo_url/i, /storage\/v1\/object\/public/i],
  },
];

const errors = [];

for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`Arquivo obrigatorio ausente: ${file}`);
  }
}

for (const check of requiredPatterns) {
  const absolutePath = path.join(root, check.file);
  if (!fs.existsSync(absolutePath)) continue;
  const contents = fs.readFileSync(absolutePath, "utf8");
  for (const pattern of check.patterns) {
    if (!pattern.test(contents)) {
      errors.push(`${check.file} nao contem padrao esperado: ${pattern}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Verificacao de anexos de propostas falhou:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Verificacao de anexos de propostas concluida.");
