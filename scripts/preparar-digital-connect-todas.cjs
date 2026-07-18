/**
 * Prepara TODAS as contas Digital para Conectar no perfil cadastrado:
 * - automation_strategy = browser
 * - não inicia connecting em massa (evita 5 Chromes de uma vez)
 *
 * Uso: node scripts/preparar-digital-connect-todas.cjs
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
  const list = await fetch(
    `${url}/rest/v1/digital_accounts?select=id,platform,label,href,handle,automation_strategy,connection_status&order=platform.asc`,
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const rows = await list.json();
  if (!Array.isArray(rows)) {
    console.error(rows);
    process.exit(1);
  }

  for (const a of rows) {
    const href = (a.href || "").trim();
    if (!href) {
      console.log("SKIP sem href:", a.platform, a.label);
      continue;
    }
    const patch = {
      automation_strategy: "browser",
      updated_at: new Date().toISOString(),
    };
    const r = await fetch(`${url}/rest/v1/digital_accounts?id=eq.${a.id}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    });
    console.log(
      r.ok ? "OK" : "FAIL",
      a.platform,
      a.label,
      "→",
      href,
      `(era ${a.automation_strategy})`
    );
  }

  console.log("");
  console.log(
    "Pronto. No admin, clique Conectar (browser) em cada rede — abre o perfil cadastrado."
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
