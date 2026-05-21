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
import {
  candidatosPathProposta,
  extrairAnexosProposta,
} from "@/lib/documental/propostaPaths";

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
  const v = valor.replace(/"/g, '""');
  return `"${v}"`;
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

  async function existeArquivo(pathArquivo: string) {
    for (const candidato of candidatosPathProposta(pathArquivo)) {
      const { data } = await admin.storage.from("propostas").download(candidato);
      if (data) {
        return { exists: true as const, resolvedPath: candidato };
      }
    }
    return { exists: false as const };
  }

  const { data: propostas, error } = await admin
    .from("propostas")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) throw error;

  const linhas: string[] = [
    "proposta_id,nome,email,coluna_url,label,path,existe,resolved_path",
  ];

  let totalRefs = 0;
  let totalOrfaos = 0;

  for (const proposta of propostas || []) {
    const anexos = extrairAnexosProposta(proposta as Record<string, unknown>);

    for (const anexo of anexos) {
      totalRefs += 1;
      const check = await existeArquivo(anexo.path);
      if (!check.exists) totalOrfaos += 1;

      linhas.push(
        [
          csvEscape(String(proposta.id)),
          csvEscape(String(proposta.nome || "")),
          csvEscape(String(proposta.email || "")),
          csvEscape(anexo.key),
          csvEscape(anexo.label),
          csvEscape(anexo.path),
          check.exists ? "sim" : "nao",
          csvEscape(check.exists ? check.resolvedPath : ""),
        ].join(",")
      );
    }
  }

  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = path.join(reportsDir, `auditoria-anexos-${stamp}.csv`);
  fs.writeFileSync(outPath, linhas.join("\n"), "utf8");

  console.log(`Propostas: ${(propostas || []).length}`);
  console.log(`Referências de anexo: ${totalRefs}`);
  console.log(`Órfãos (sem arquivo no storage): ${totalOrfaos}`);
  console.log(`CSV: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
