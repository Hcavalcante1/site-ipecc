/**
 * Verifica tabelas/colunas/bucket do módulo Digital.
 * Uso: node scripts/probe-digital-readiness.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const checks = [];

  for (const table of [
    "digital_accounts",
    "digital_posts",
    "digital_post_targets",
    "digital_publish_logs",
    "digital_media",
  ]) {
    const { error } = await sb.from(table).select("id").limit(1);
    checks.push({
      name: `tabela ${table}`,
      ok: !error,
      detail: error?.message || "OK",
    });
  }

  const { data: postsProbe, error: postsErr } = await sb
    .from("digital_posts")
    .select(
      "id, automation_status, media_id, external_post_id, dry_run"
    )
    .limit(1);
  checks.push({
    name: "colunas automation em digital_posts",
    ok: !postsErr,
    detail: postsErr?.message || "OK",
  });

  const { data: accProbe, error: accErr } = await sb
    .from("digital_accounts")
    .select("id, automation_enabled, connection_status")
    .limit(1);
  checks.push({
    name: "colunas automation em digital_accounts",
    ok: !accErr,
    detail: accErr?.message || `contas=${accProbe?.length ?? 0}`,
  });

  const buckets = await sb.storage.listBuckets();
  const hasBucket = (buckets.data || []).some((b) => b.name === "digital-media");
  checks.push({
    name: "bucket digital-media",
    ok: !buckets.error && hasBucket,
    detail: buckets.error?.message || (hasBucket ? "OK" : "ausente"),
  });

  let fail = 0;
  for (const c of checks) {
    const mark = c.ok ? "OK" : "FAIL";
    if (!c.ok) fail++;
    console.log(`${mark}  ${c.name} — ${c.detail}`);
  }

  if (fail) {
    console.error(`\n${fail} verificação(ões) falharam.`);
    process.exit(1);
  }
  console.log("\nDigital pronto no Supabase (admin + worker).");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
