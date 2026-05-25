import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "app");

const uploadPatterns = [
  /\.storage\s*\.\s*from\s*\(\s*["'][^"']+["']\s*\)\s*\.upload\s*\(/,
  /type=["']file["']/,
];

const requiredSafetyPatterns = [
  {
    name: "upload com tratamento de erro",
    pattern: /if\s*\(\s*(?:error|uploadError)\s*\)\s*(?:{|throw|return|console\.error)/,
  },
  {
    name: "restrição explícita para PDF em anexos documentais",
    pattern: /accept=["']application\/pdf["']/,
  },
];

const errors = [];
const warnings = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    if (!/\.(tsx|ts)$/.test(entry.name)) return [];
    return [absolute];
  });
}

const files = walk(appDir);
const uploadFiles = files.filter((file) => {
  const content = fs.readFileSync(file, "utf8");
  return uploadPatterns.some((pattern) => pattern.test(content));
});

if (!uploadFiles.length) {
  warnings.push("Nenhum fluxo de anexo/upload encontrado em app/.");
}

for (const file of uploadFiles) {
  const relative = path.relative(root, file);
  const content = fs.readFileSync(file, "utf8");
  for (const requirement of requiredSafetyPatterns) {
    if (!requirement.pattern.test(content)) {
      errors.push(`${relative}: ausente ${requirement.name}.`);
    }
  }
}

console.log("Audit anexos");
console.log(`Arquivos com upload/anexo: ${uploadFiles.length}`);
for (const file of uploadFiles) console.log(`- ${path.relative(root, file)}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error("\nErrors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: auditoria local de anexos sem erros críticos.");
