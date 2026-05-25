import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const filesToInspect = [
  "app/propostas/page.tsx",
  "app/admin/propostas/page.tsx",
  "app/admin/propostas/[id]/page.tsx",
  "app/editais/page.tsx",
  "app/editais/[id]/page.tsx",
];

const requiredSignals = [
  { file: "app/propostas/page.tsx", text: ".storage", label: "upload via Supabase Storage" },
  { file: "app/propostas/page.tsx", text: ".from(\"propostas\")", label: "bucket/tabela propostas" },
  { file: "app/admin/propostas/page.tsx", text: "storage/v1/object/public", label: "links publicos de anexos no admin" },
];

const forbiddenPatterns = [
  { regex: /\bDROP\b/i, label: "SQL destrutivo DROP" },
  { regex: /\bTRUNCATE\b/i, label: "SQL destrutivo TRUNCATE" },
  { regex: /SOMENTE_TABELA\s*=\s*true/i, label: "modo SOMENTE_TABELA ativado" },
];

const failures = [];
const warnings = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Arquivo esperado ausente: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

const contents = new Map(filesToInspect.map((file) => [file, read(file)]));

for (const signal of requiredSignals) {
  const content = contents.get(signal.file) ?? "";
  if (!content.includes(signal.text)) {
    failures.push(`${signal.file}: sinal ausente (${signal.label})`);
  }
}

for (const [file, content] of contents) {
  for (const forbidden of forbiddenPatterns) {
    if (forbidden.regex.test(content)) {
      failures.push(`${file}: padrao proibido encontrado (${forbidden.label})`);
    }
  }
}

for (const [file, content] of contents) {
  if (content.includes("process.env.") && !content.includes("NEXT_PUBLIC_SUPABASE")) {
    warnings.push(`${file}: revisar uso de env fora do padrao publico Supabase.`);
  }
}

console.log("== Auditoria documental/storage de anexos ==");
for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`ERRO: ${failure}`);
  }
  process.exit(1);
}

console.log("OK: sinais essenciais de anexos preservados.");
