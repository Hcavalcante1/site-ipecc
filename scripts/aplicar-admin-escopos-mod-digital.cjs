/**
 * Aplica docs/sql/admin-escopos-mod-digital.sql no Postgres do Supabase.
 * Uso: node scripts/aplicar-admin-escopos-mod-digital.cjs
 *
 * Requer DATABASE_URL / DIRECT_URL, ou
 * SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL.
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
    `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
  ];
}

async function main() {
  loadEnvLocal();

  const sqlPath = path.join(
    process.cwd(),
    "docs/sql/admin-escopos-mod-digital.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

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
        "Alternativa: cole docs/sql/admin-escopos-mod-digital.sql no SQL Editor."
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
        select column_name, data_type, column_default
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'admin_escopos'
          and column_name = 'mod_digital'
      `);
      if (!check.rows.length) {
        throw new Error("Coluna mod_digital nao encontrada apos ALTER.");
      }
      console.log("OK: admin_escopos.mod_digital", check.rows[0]);
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

  console.error(lastError?.message || lastError || "Falha ao aplicar SQL.");
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
