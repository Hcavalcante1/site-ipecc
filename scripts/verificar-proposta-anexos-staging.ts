/**
 * Verificação read-only pós-M1: compara linhas em proposta_anexos vs referências do audit.
 * Uso: npm run verify:proposta-anexos
 */

import { createClient } from "@supabase/supabase-js";
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
    console.error(
      "Execute no Supabase STAGING: docs/sql/proposta_anexos-M1-staging-APLICAR.sql (PASSOS 1–3)"
    );
    process.exit(1);
  }

  const { count, error: countErr } = await admin
    .from("proposta_anexos")
    .select("id", { count: "exact", head: true });

  if (countErr) {
    console.error("Erro ao contar proposta_anexos:", countErr.message);
    process.exit(1);
  }

  const { gerarAuditoriaAnexos } = await import("@/lib/documental/auditoriaAnexos");
  const { resumo } = await gerarAuditoriaAnexos(admin);

  console.log("proposta_anexos (linhas):", count ?? 0);
  console.log("audit referências:", resumo.referencias);
  console.log("audit órfãos:", resumo.orfaos);

  if (resumo.orfaos > 0) {
    console.error("FALHA: existem órfãos — corrija antes de M2.");
    process.exit(1);
  }

  if ((count ?? 0) < resumo.referencias) {
    console.warn(
      "AVISO: menos linhas na tabela que referências no audit.",
      "Rode novamente o INSERT legado (PASSO 4) ou confira paths vazios."
    );
    process.exit(1);
  }

  if ((count ?? 0) > resumo.referencias) {
    console.warn(
      "AVISO: mais linhas na tabela que referências (pode ser reexecução parcial).",
      "Conferir duplicatas lógicas."
    );
  }

  console.log("OK: M1 consistente com auditoria (read-only).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
