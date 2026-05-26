/**
 * Verifica tabela whatsapp_leads no staging.
 * DDL: aplicar docs/sql/whatsapp-leads-staging.sql no Dashboard (SQL Editor).
 * Uso: npm run aplicar:whatsapp-leads-staging
 */

import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

async function main() {
  loadEnvLocal();
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const { supabaseAdmin } = await import("../lib/supabaseAdmin");

  const probe = await supabaseAdmin.from("whatsapp_leads").select("id").limit(1);

  if (probe.error) {
    console.error("Tabela whatsapp_leads inacessível:", probe.error.message);
    console.error("\nAplique no Dashboard STAGING (SQL Editor):");
    console.error("  docs/sql/whatsapp-leads-staging.sql");
    console.error("\nDepois ative em .env.local:");
    console.error("  WHATSAPP_LEADS_PERSIST_SUPABASE=1");
    process.exit(1);
  }

  console.log("OK: tabela whatsapp_leads acessível.");
  console.log("Ative persistência: WHATSAPP_LEADS_PERSIST_SUPABASE=1");
  console.log("Valide: npm run validar:whatsapp-leads-staging");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
