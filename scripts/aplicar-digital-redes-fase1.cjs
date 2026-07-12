/**
 * Aplica docs/sql/digital-redes-fase1.sql no Postgres do Supabase.
 * Uso (PowerShell):
 *   $env:SUPABASE_DB_PASSWORD="senha-do-painel"
 *   node scripts/aplicar-digital-redes-fase1.mjs
 *
 * Ou defina DATABASE_URL / DIRECT_URL / SUPABASE_DB_PASSWORD no .env.local
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

  const sqlPath = path.join(process.cwd(), "docs/sql/digital-redes-fase1.sql");
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
        "No Supabase: Project Settings → Database → Database password."
      );
      console.error(
        "Alternativa: cole o conteúdo de docs/sql/digital-redes-fase1.sql no SQL Editor."
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
    const check = await client.query(
      `select count(*)::int as n from digital_accounts where scope = 'site' and ativo = true`
    );
    console.log("OK: SQL digital-redes-fase1 aplicado.");
    console.log("Contas site ativas:", check.rows[0]?.n ?? 0);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Falha ao aplicar SQL:", err.message || err);
  process.exit(1);
});
