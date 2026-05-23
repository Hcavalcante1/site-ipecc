/**
 * Upsert idempotente: alinha proposta_anexos com colunas *_url (gap pós-testes).
 * Uso: npm run sync:proposta-anexos
 */

import { createClient } from "@supabase/supabase-js";
import { sincronizarAnexosPropostaTabela } from "@/lib/documental/propostaAnexosEscrita";
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

  const { data: propostas, error } = await admin.from("propostas").select("*");
  if (error) throw error;

  let total = 0;
  for (const p of propostas || []) {
    const sync = await sincronizarAnexosPropostaTabela(
      admin,
      String(p.id),
      p as Record<string, unknown>,
      "legado"
    );
    if (!sync.ok) {
      console.error("FALHA", p.id, sync.error);
      process.exit(1);
    }
    total += sync.linhas;
  }

  console.log("OK: sincronizadas", propostas?.length ?? 0, "propostas;", total, "linhas upsert");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
