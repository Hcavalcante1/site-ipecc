/**
 * Aplica docs/sql/digital-redes-automation-phase1.sql
 * Uso: node scripts/aplicar-digital-redes-automation-phase1.cjs
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

function buildTries(ref, password) {
  const enc = encodeURIComponent(password);
  return [
    `postgresql://postgres.${ref}:${enc}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
  ];
}

async function main() {
  loadEnvLocal();
  const sql = fs.readFileSync(
    path.join(process.cwd(), "docs/sql/digital-redes-automation-phase1.sql"),
    "utf8"
  );

  let tries = [];
  if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
    tries = [process.env.DATABASE_URL || process.env.DIRECT_URL];
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    const password =
      process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
    if (!ref || !password) {
      console.error(
        "Falta DATABASE_URL ou SUPABASE_DB_PASSWORD (+ NEXT_PUBLIC_SUPABASE_URL)."
      );
      console.error(
        "Alternativa: cole docs/sql/digital-redes-automation-phase1.sql no SQL Editor."
      );
      process.exit(1);
    }
    tries = buildTries(ref, password);
  }

  let lastError = null;
  for (const connectionString of tries) {
    const label = String(connectionString).replace(/:[^:@/]+@/, ":****@");
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    });
    try {
      console.log("Tentando", label);
      await client.connect();
      await client.query(sql);
      const check = await client.query(`
        select column_name from information_schema.columns
        where table_schema='public' and table_name='digital_accounts'
          and column_name='automation_strategy'
      `);
      console.log(
        "OK automation_strategy:",
        check.rows[0]?.column_name || "AUSENTE"
      );
      await client.end();
      return;
    } catch (err) {
      lastError = err;
      console.error("FAIL:", label, err.message || err);
      try {
        await client.end();
      } catch {}
    }
  }
  console.error(lastError?.message || lastError);
  process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
