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
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

function csvEscape(valor: string) {
  return `"${valor.replace(/"/g, '""')}"`;
}

async function main() {
  loadEnvLocal({
    keys: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  });
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
