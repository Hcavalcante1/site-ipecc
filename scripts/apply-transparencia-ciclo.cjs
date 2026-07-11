/**
 * Aplica docs/sql/transparencia-modulo-ciclo-fase-1.sql
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
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`,
  ];
}

async function tryConnect(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  return client;
}

async function main() {
  loadEnvLocal();

  const sqlPath = path.join(
    process.cwd(),
    "docs/sql/transparencia-modulo-ciclo-fase-1.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  let connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
  const candidates = [];

  if (connectionString) {
    candidates.push(connectionString);
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    const password =
      process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
    if (!ref || !password) {
      console.error("Falta DATABASE_URL ou SUPABASE_DB_PASSWORD.");
      process.exit(1);
    }
    candidates.push(...buildCandidates(ref, password));
  }

  let client = null;
  let lastErr = null;
  for (const cs of candidates) {
    const host = cs.replace(/:[^:@/]+@/, ":****@");
    try {
      console.log("Tentando:", host);
      client = await tryConnect(cs);
      console.log("Conectado.");
      break;
    } catch (e) {
      lastErr = e;
      console.error("Falhou:", e.code || "", e.message || e);
    }
  }

  if (!client) {
    throw lastErr || new Error("Nenhuma conexao funcionou.");
  }

  try {
    await client.query(sql);
    console.log("OK: SQL transparencia-modulo-ciclo-fase-1 aplicado.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Falha ao aplicar SQL:", err.message || err);
  process.exit(1);
});
