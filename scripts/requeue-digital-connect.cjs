/**
 * Reenfileira Conectar de uma plataforma (ex.: facebook).
 * Uso: node scripts/requeue-digital-connect.cjs facebook
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

const platform = (process.argv[2] || "facebook").toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  const list = await fetch(
    `${url}/rest/v1/digital_accounts?platform=eq.${platform}&select=id,label,href,connection_status`,
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const rows = await list.json();
  if (!Array.isArray(rows) || !rows.length) {
    console.error("Nenhuma conta", platform);
    process.exit(1);
  }
  const acc = rows[0];
  const patch = {
    connection_status: "connecting",
    automation_strategy: "browser",
    requires_reconnect: false,
    last_connection_error: null,
    updated_at: new Date().toISOString(),
  };
  const r = await fetch(`${url}/rest/v1/digital_accounts?id=eq.${acc.id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  console.log("status", r.status, acc.label, acc.href);
  console.log(await r.text());
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
