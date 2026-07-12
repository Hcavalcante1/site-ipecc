/**
 * Aplica docs/sql/admin-escopos-mod-digital.sql no Postgres do Supabase.
 * Uso: node scripts/aplicar-admin-escopos-mod-digital.cjs
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

async function main() {
  loadEnvLocal();

  const sqlPath = path.join(
    process.cwd(),
    "docs/sql/admin-escopos-mod-digital.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  let connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!connectionString) {
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
    connectionString = `postgresql://postgres.${ref}:${encodeURIComponent(
      password
    )}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
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
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
