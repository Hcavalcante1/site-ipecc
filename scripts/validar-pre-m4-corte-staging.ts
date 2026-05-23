/**
 * M4.1 — Verifica se colunas *_url e proposta_anexos estão alinhadas (pré-corte).
 * Uso: npm run validar:pre-m4-corte
 */

import { createClient } from "@supabase/supabase-js";
import { extrairAnexosProposta } from "@/lib/documental/propostaPaths";
import {
  assinaturaAnexos,
  carregarAnexosTabelaPorPropostas,
} from "@/lib/documental/propostaAnexosHibrido";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

async function main() {
  loadEnvLocal();
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
  let propostasComAnexo = 0;

  for (const p of propostas || []) {
    const id = String(p.id);
    const row = await admin.from("propostas").select("*").eq("id", id).single();
    if (row.error || !row.data) continue;

    const legado = extrairAnexosProposta(row.data as Record<string, unknown>);
    const tabela = porTabela.get(id) || [];

    if (legado.length === 0 && tabela.length === 0) continue;

    propostasComAnexo++;

    if (assinaturaAnexos(legado) !== assinaturaAnexos(tabela)) {
      divergencias++;
      console.error(
        "DIVERGÊNCIA",
        id,
        p.nome,
        "| legado:",
        legado.length,
        "tabela:",
        tabela.length
      );
    }
  }

  console.log("Propostas:", ids.length);
  console.log("Com anexo (legado ou tabela):", propostasComAnexo);

  if (divergencias > 0) {
    console.error("FALHA: divergências legado × tabela:", divergencias);
    console.error("Corrija com: npm run sync:proposta-anexos");
    process.exit(1);
  }

  console.log("OK: pronto para M4 — legado e proposta_anexos alinhados.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
