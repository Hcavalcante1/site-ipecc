/**
 * Gera rascunhos Digital a partir de notícias/eventos/projetos.
 * Uso: npm run digital:gerar-rascunhos
 * Requer SUPABASE_SERVICE_ROLE_KEY e tabelas de docs/sql/digital-redes-fase1.sql
 */

import fs from "fs";
import path from "path";
import { generateDigitalDrafts } from "../lib/digital/draftAgent";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

async function main() {
  loadEnvLocal();
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
