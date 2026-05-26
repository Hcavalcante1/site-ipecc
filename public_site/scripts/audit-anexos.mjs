import fs from "node:fs";

const files = [
  "app/propostas/page.tsx",
  "app/admin/propostas/page.tsx",
  "app/admin/propostas/[id]/page.tsx",
];

const existingFiles = files.filter((file) => fs.existsSync(file));
const combined = existingFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

const requiredMarkers = [
  ".storage",
  ".from(\"propostas\")",
  "arquivo_url",
  "estatuto_url",
  "cnpj_url",
];

const missingMarkers = requiredMarkers.filter((marker) => !combined.includes(marker));

if (missingMarkers.length > 0) {
  throw new Error(`Marcadores documentais ausentes: ${missingMarkers.join(", ")}`);
}

if (combined.includes("SOMENTE_TABELA")) {
  throw new Error("Flag SOMENTE_TABELA encontrada; fallback hibrido deve permanecer preservado.");
}

console.log("Auditoria local de anexos concluida.");
