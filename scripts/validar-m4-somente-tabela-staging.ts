/**
 * M4.2 — Smoke leitura somente-tabela (read-only).
 * Uso: npm run validar:m4-somente-tabela
 */

import { createClient } from "@supabase/supabase-js";
import {
  assinaturaAnexos,
  carregarAnexosTabelaPorPropostas,
  resolverAnexosProposta,
} from "@/lib/documental/propostaAnexosHibrido";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

async function main() {
  loadEnvLocal();
  process.env.USE_PROPOSTA_ANEXOS_SOMENTE_TABELA = "true";
  process.env.USE_PROPOSTA_ANEXOS_TABLE = "true";

  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: propostas } = await admin.from("propostas").select("id, nome");
  const ids = (propostas || []).map((p) => String(p.id));
  const porTabela = await carregarAnexosTabelaPorPropostas(admin, ids);

  let divergencias = 0;

  for (const p of propostas || []) {
    const id = String(p.id);
    const row = await admin.from("propostas").select("*").eq("id", id).single();
    if (row.error || !row.data) continue;

    const tabela = porTabela.get(id) || [];
    const somente = resolverAnexosProposta(row.data as Record<string, unknown>, tabela);

    if (assinaturaAnexos(somente) !== assinaturaAnexos(tabela)) {
      divergencias++;
      console.error("FALHA somente-tabela", id, p.nome);
    }
  }

  const { count: linhasTabela } = await admin
    .from("proposta_anexos")
    .select("*", { count: "exact", head: true })
    .eq("status", "ativo");

  console.log("Propostas:", ids.length);
  console.log("Linhas proposta_anexos (ativo):", linhasTabela ?? 0);

  if (divergencias > 0) {
    process.exit(1);
  }

  console.log("OK: M4.2 somente-tabela consistente com proposta_anexos.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
