/**
 * Gera rascunhos Digital a partir de notícias/eventos/projetos.
 * Uso: npm run digital:gerar-rascunhos
 * Requer SUPABASE_SERVICE_ROLE_KEY e tabelas de docs/sql/digital-redes-fase1.sql
 */

import { generateDigitalDrafts } from "../lib/digital/draftAgent";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

async function main() {
  const dry = process.argv.includes("--dry");
  const supabase = getSupabaseAdmin();
  const result = await generateDigitalDrafts(supabase, {
    persist: !dry,
    createdBy: "cli:digital:gerar-rascunhos",
  });

  console.log(
    dry
      ? `[dry] drafts montados: ${result.drafts.length}`
      : `Gerados: ${result.generated} | Ignorados: ${result.skipped}`
  );
  for (const d of result.drafts) {
    console.log(`- ${d.source_type}/${d.source_id}: ${d.title}`);
  }
  if (result.errors.length) {
    console.error("Erros:");
    for (const e of result.errors) console.error(" ", e);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
