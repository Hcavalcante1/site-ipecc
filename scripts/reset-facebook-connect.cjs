/**
 * Reseta contas Facebook marcadas connected sem login real (falso positivo antigo).
 * Uso: node scripts/reset-facebook-connect.cjs
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb
    .from("digital_accounts")
    .update({
      connection_status: "disconnected",
      requires_reconnect: true,
      automation_enabled: false,
      last_connection_error:
        "Reconecte: faça login completo no navegador (perfil público não conta como sessão).",
      updated_at: new Date().toISOString(),
    })
    .eq("platform", "facebook")
    .eq("scope", "site")
    .select("id, label, connection_status");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log("Reset Facebook:", data);
}

main();
