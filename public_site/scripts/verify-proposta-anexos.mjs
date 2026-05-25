import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("app/propostas/page.tsx");
const source = fs.readFileSync(sourcePath, "utf8");

const requiredSnippets = [
  "const MAX_UPLOAD_BYTES = 10 * 1024 * 1024",
  "const PDF_ACCEPT = \"application/pdf,.pdf\"",
  "function validarPdf(file: File)",
  "file.type === \"application/pdf\" || nome.endsWith(\".pdf\")",
  "crypto.randomUUID()",
  ".from(\"propostas\")",
  "public/${nomeFinal}",
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));

if (missing.length > 0) {
  console.error("Contrato de anexos de propostas incompleto:");
  for (const snippet of missing) {
    console.error(`- ausente: ${snippet}`);
  }
  process.exit(1);
}

console.log("OK contrato local de anexos de propostas.");
