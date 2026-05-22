/**
 * Auditoria read-only de anexos (propostas × storage).
 * Não altera banco nem storage.
 *
 * Uso: npm run audit:anexos
 * Saída: reports/auditoria-anexos-YYYY-MM-DD.csv
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function carregarEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Arquivo .env.local não encontrado na raiz do projeto.");
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (
      key === "NEXT_PUBLIC_SUPABASE_URL" ||
      key === "SUPABASE_SERVICE_ROLE_KEY"
    ) {
      process.env[key] = value;
    }
  }
}

function csvEscape(valor: string) {
  return `"${valor.replace(/"/g, '""')}"`;
}

async function main() {
  carregarEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local"
    );
  }

  const admin = createClient(url, serviceKey);
  const { gerarAuditoriaAnexos } = await import("@/lib/documental/auditoriaAnexos");
  const { linhas, resumo } = await gerarAuditoriaAnexos(admin);

  const header =
    "proposta_id,nome,email,coluna_url,label,path,existe,resolved_path";
  const body = linhas.map((linha) =>
    [
      csvEscape(linha.proposta_id),
      csvEscape(linha.nome),
      csvEscape(linha.email),
      csvEscape(linha.coluna_url),
      csvEscape(linha.label),
      csvEscape(linha.path),
      linha.existe ? "sim" : "nao",
      csvEscape(linha.resolved_path || ""),
    ].join(",")
  );

  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = path.join(reportsDir, `auditoria-anexos-${stamp}.csv`);
  fs.writeFileSync(outPath, [header, ...body].join("\n"), "utf8");

  console.log(`Propostas: ${resumo.propostas}`);
  console.log(`Referências de anexo: ${resumo.referencias}`);
  console.log(`Órfãos (sem arquivo no storage): ${resumo.orfaos}`);
  console.log(`CSV: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
