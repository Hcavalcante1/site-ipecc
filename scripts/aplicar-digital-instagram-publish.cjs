/**
 * Aplica docs/sql/digital-redes-instagram-publish.sql no Postgres do Supabase.
 * Uso: node scripts/aplicar-digital-instagram-publish.cjs
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
    "docs/sql/digital-redes-instagram-publish.sql"
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
        "Alternativa: cole docs/sql/digital-redes-instagram-publish.sql no SQL Editor."
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
      select column_name
      from information_schema.columns
      where table_name = 'digital_posts'
        and column_name in ('external_post_id', 'publish_error', 'published_via')
      order by 1
    `);
    console.log(
      "OK:",
      check.rows.map((r) => r.column_name).join(", ") || "(sem colunas)"
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
