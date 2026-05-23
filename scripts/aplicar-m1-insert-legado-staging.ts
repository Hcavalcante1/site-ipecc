/**
 * M1 — INSERT legado em proposta_anexos (staging).
 * Equivalente ao PASSO 4 de docs/sql/proposta_anexos-M1-staging-APLICAR.sql
 * Requer tabela já criada. Idempotente (ignora duplicatas).
 *
 * Uso: npm run apply:m1-anexos-insert
 */

import { createClient } from "@supabase/supabase-js";
import { extrairAnexosProposta } from "@/lib/documental/propostaPaths";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

async function main() {
  loadEnvLocal({
    keys: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  });
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const probe = await admin.from("proposta_anexos").select("id").limit(1);

  if (probe.error) {
    console.error("Tabela proposta_anexos inacessível:", probe.error.message);
    console.error("Execute antes no Dashboard STAGING:");
    console.error("  docs/sql/proposta_anexos-M1-staging-APLICAR.sql (PASSOS 1–3)");
    process.exit(1);
  }

  const { count, error: countErr } = await admin
    .from("proposta_anexos")
    .select("id", { count: "exact", head: true });

  if (countErr) {
    console.error("Erro ao contar:", countErr.message);
    process.exit(1);
  }

  if ((count ?? 0) > 0) {
    console.log("proposta_anexos já tem", count, "linhas — nada a inserir.");
    return;
  }

  const { data: propostas, error: propErr } = await admin.from("propostas").select("*");
  if (propErr) throw propErr;

  const rows: {
    proposta_id: string;
    chave: string;
    label: string;
    storage_path: string;
    origem: string;
  }[] = [];

  for (const proposta of propostas || []) {
    const p = proposta as Record<string, unknown> & { id: string };
    for (const anexo of extrairAnexosProposta(p)) {
      rows.push({
        proposta_id: p.id,
        chave: anexo.key,
        label: anexo.label,
        storage_path: anexo.path,
        origem: "legado",
      });
    }
  }

  if (rows.length === 0) {
    console.log("Nenhum anexo legado para migrar.");
    return;
  }

  const { error: insErr } = await admin.from("proposta_anexos").insert(rows);
  if (insErr) {
    console.error("FALHA INSERT:", insErr.message);
    process.exit(1);
  }

  console.log("OK: inseridas", rows.length, "linhas em proposta_anexos");
  console.log("Próximo: npm run verify:proposta-anexos");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
