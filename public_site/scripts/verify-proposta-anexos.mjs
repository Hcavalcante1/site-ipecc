import fs from "node:fs";
import path from "node:path";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

const checks = [
  {
    label: "helper compartilhado",
    source: read("lib/fileUploadGuards.ts"),
    snippets: [
      "export const MAX_PDF_UPLOAD_BYTES = 10 * 1024 * 1024",
      "export const PDF_ACCEPT = \"application/pdf,.pdf\"",
      "export function validatePdfFile(file: File)",
      "file.type === \"application/pdf\" || name.endsWith(\".pdf\")",
      "crypto.randomUUID()",
    ],
  },
  {
    label: "propostas publicas",
    source: read("app/propostas/page.tsx"),
    snippets: [
      "validatePdfFile(file)",
      "buildStorageFileName(file, tipo)",
      ".from(\"propostas\")",
      "public/${nomeFinal}",
    ],
  },
  {
    label: "admin editais",
    source: read("app/admin/editais/page.tsx"),
    snippets: [
      "validatePdfFile(arquivo)",
      "buildStorageFileName(arquivo, \"edital\")",
      ".from(\"editais\")",
      "contentType: \"application/pdf\"",
    ],
  },
];

const missing = checks.flatMap((check) =>
  check.snippets
    .filter((snippet) => !check.source.includes(snippet))
    .map((snippet) => `${check.label}: ${snippet}`)
);

if (missing.length > 0) {
  console.error("Contrato local de anexos PDF incompleto:");
  for (const snippet of missing) {
    console.error(`- ausente: ${snippet}`);
  }
  process.exit(1);
}

console.log("OK contrato local de anexos PDF.");
