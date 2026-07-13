/**
 * Aplica docs/sql/documentos-oficiais-fase1.sql
 * Uso: node scripts/aplicar-documentos-oficiais-fase1.cjs
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
    `postgresql://postgres.${ref}:${enc}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
  ];
}

async function main() {
  loadEnvLocal();
  const sqlPath = path.join(
    process.cwd(),
    "docs/sql/documentos-oficiais-fase1.sql"
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
      connectionTimeoutMillis: 15000,
    });
    try {
      await client.connect();
      await client.query(sql);
      const { rows } = await client.query(
        "select slug, tipo_emissao, ativo from documentos_oficiais_modelos order by slug"
      );
      console.log("OK documentos_oficiais em", label);
      console.log(
        "modelos:",
        rows.map((r) => r.slug).join(", ")
      );
      await client.end();
      return;
    } catch (err) {
      lastError = err;
      console.warn("Falhou", label, String(err?.message || err));
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  console.error("Não aplicou SQL:", lastError?.message || lastError);
  process.exit(1);
}

main();
