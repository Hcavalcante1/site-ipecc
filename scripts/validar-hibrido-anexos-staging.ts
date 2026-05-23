/**
 * Valida paridade legado × híbrido (M2) — read-only.
 * Uso: USE_PROPOSTA_ANEXOS_TABLE=true npm run validar:hibrido-anexos
 */

import { createClient } from "@supabase/supabase-js";
import { extrairAnexosProposta } from "@/lib/documental/propostaPaths";
import {
  carregarAnexosTabelaPorPropostas,
  mesclarAnexosLegadoETabela,
  resolverAnexosProposta,
} from "@/lib/documental/propostaAnexosHibrido";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

function assinatura(refs: { key: string; path: string }[]) {
  return refs
    .map((r) => `${r.key}:${r.path}`)
    .sort()
    .join("|");
}

async function main() {
  loadEnvLocal();
  process.env.USE_PROPOSTA_ANEXOS_TABLE = "true";

  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: propostas, error } = await admin.from("propostas").select("id, nome");
  if (error) throw error;

  const ids = (propostas || []).map((p) => String(p.id));
  const porTabela = await carregarAnexosTabelaPorPropostas(admin, ids);

  let divergencias = 0;

  for (const p of propostas || []) {
    const id = String(p.id);
    const row = await admin.from("propostas").select("*").eq("id", id).single();
    if (row.error || !row.data) continue;

    const legado = extrairAnexosProposta(row.data as Record<string, unknown>);
    const tabela = porTabela.get(id) || [];
    const hibrido = resolverAnexosProposta(
      row.data as Record<string, unknown>,
      tabela
    );
    const mergeManual = mesclarAnexosLegadoETabela(legado, tabela);

    if (assinatura(hibrido) !== assinatura(mergeManual)) {
      console.error("FALHA merge interno:", id);
      divergencias++;
      continue;
    }

    if (assinatura(legado) !== assinatura(hibrido)) {
      console.error(
        "DIVERGÊNCIA",
        id,
        p.nome,
        "| legado:",
        legado.length,
        "híbrido:",
        hibrido.length
      );
      divergencias++;
    }
  }

  const totalTabela = [...porTabela.values()].reduce((s, a) => s + a.length, 0);
  console.log("Propostas:", ids.length);
  console.log("Linhas proposta_anexos (ativo):", totalTabela);

  if (divergencias > 0) {
    console.error("FALHA: divergências legado vs híbrido:", divergencias);
    process.exit(1);
  }

  console.log("OK: paridade legado × híbrido (M2 leitura).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
