/**
 * Lista contas digital e status de conexão (debug Conectar).
 * Uso: node scripts/probe-digital-accounts-connect.cjs
 */
const fs = require("fs");
const path = require("path");

for (const line of fs
  .readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
  .split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  const r = await fetch(
    url +
      "/rest/v1/digital_accounts?select=id,platform,label,href,handle,ativo,automation_enabled,automation_strategy,connection_status,last_connection_error,updated_at&order=platform.asc",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const text = await r.text();
  console.log("status", r.status);
  let rows = [];
  try {
    rows = JSON.parse(text);
  } catch {
    console.log(text.slice(0, 500));
    process.exit(1);
  }
  for (const a of rows) {
    console.log(
      [
        a.platform,
        a.connection_status,
        a.automation_strategy,
        a.automation_enabled ? "auto=on" : "auto=off",
        a.label,
        a.href || "(sem href)",
        a.last_connection_error || "",
      ].join(" | ")
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
