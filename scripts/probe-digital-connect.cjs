/**
 * Lê status de conexão Digital e últimos logs.
 * Uso: node scripts/probe-digital-connect.cjs
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
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: accounts, error: aErr } = await sb
    .from("digital_accounts")
    .select(
      "platform,label,connection_status,last_connection_error,last_connected_at,updated_at"
    )
    .order("updated_at", { ascending: false });
  if (aErr) throw aErr;
  console.log("--- contas ---");
  for (const a of accounts || []) {
    console.log(
      `${a.platform.padEnd(10)} ${String(a.connection_status).padEnd(14)} ${a.last_connection_error || ""}`
    );
  }

  const { data: logs, error: lErr } = await sb
    .from("digital_publish_logs")
    .select("created_at,event_type,message,platform")
    .in("event_type", [
      "account_connect_started",
      "account_connect_success",
      "account_connect_failed",
      "account_verify_started",
      "account_verify_success",
      "account_verify_failed",
      "account_connect_requested",
    ])
    .order("created_at", { ascending: false })
    .limit(12);
  if (lErr) throw lErr;
  console.log("\n--- logs ---");
  for (const l of logs || []) {
    console.log(`${l.created_at} ${l.event_type} ${l.platform || ""} ${l.message}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
