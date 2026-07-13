/**
 * Aplica apenas docs/sql/gestao-documental-documenso.sql
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

function buildCandidates(ref, password) {
  const enc = encodeURIComponent(password);
  return [
    `postgresql://postgres.${ref}:${enc}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
  ];
}

async function main() {
  loadEnvLocal();
  let candidates = [];
  if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
    candidates = [process.env.DATABASE_URL || process.env.DIRECT_URL];
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    const password =
      process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
    if (!ref || !password) {
      console.error("Falta senha do banco (SUPABASE_DB_PASSWORD).");
      process.exit(2);
    }
    candidates = buildCandidates(ref, password);
  }

  let client = null;
  for (const cs of candidates) {
    const c = new Client({
      connectionString: cs,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    try {
      await c.connect();
      client = c;
      console.log("Conectado", String(cs).replace(/:[^:@/]+@/, ":****@"));
      break;
    } catch (err) {
      console.error("FAIL", err.message);
      try {
        await c.end();
      } catch {
        /* */
      }
    }
  }
  if (!client) process.exit(1);

  const sql = fs.readFileSync(
    path.join(process.cwd(), "docs/sql/gestao-documental-documenso.sql"),
    "utf8"
  );
  await client.query(sql);
  const { rows } = await client.query(
    "select code, name, ativo from gd_signature_providers order by code"
  );
  console.log("providers:", rows);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
