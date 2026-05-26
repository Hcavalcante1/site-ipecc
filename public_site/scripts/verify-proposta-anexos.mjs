import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const propostasPage = await readFile(path.join(root, "app", "propostas", "page.tsx"), "utf8");
const adminListPage = await readFile(path.join(root, "app", "admin", "propostas", "page.tsx"), "utf8");
const adminDetailPage = await readFile(path.join(root, "app", "admin", "propostas", "[id]", "page.tsx"), "utf8");

const checks = [
  {
    label: "Public proposal upload uses Supabase storage bucket",
    ok: propostasPage.includes('.from("propostas")') && propostasPage.includes(".upload("),
  },
  {
    label: "Public proposal upload stores proposal, estatuto and cnpj URLs",
    ok:
      propostasPage.includes("arquivo_url") &&
      propostasPage.includes("estatuto_url") &&
      propostasPage.includes("cnpj_url"),
  },
  {
    label: "Public proposal file inputs accept PDFs",
    ok: (propostasPage.match(/accept="application\/pdf"/g) ?? []).length >= 3,
  },
  {
    label: "Admin proposal list exposes stored attachments",
    ok:
      adminListPage.includes("arquivo_url") &&
      adminListPage.includes("estatuto_url") &&
      adminListPage.includes("cnpj_url"),
  },
  {
    label: "Admin proposal detail exposes at least main proposal attachment",
    ok: adminDetailPage.includes("arquivo_url"),
  },
];

const failed = checks.filter((check) => !check.ok);

if (failed.length > 0) {
  console.error("Proposal attachment verification failed:");
  for (const check of failed) console.error(`- ${check.label}`);
  process.exit(1);
}

console.log("Proposal attachment verification passed.");
