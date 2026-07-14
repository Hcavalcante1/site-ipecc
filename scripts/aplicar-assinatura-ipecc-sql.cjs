/**
 * Aplica docs/sql/gestao-documental-assinatura-ipecc.sql no Postgres do Supabase.
 * Uso: node scripts/aplicar-assinatura-ipecc-sql.cjs
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
    `postgresql://postgres.${ref}:${enc}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-us-west-2.pooler.supabase.com:5432/postgres`,
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
      console.error(
        "Falta DATABASE_URL ou SUPABASE_DB_PASSWORD (+ NEXT_PUBLIC_SUPABASE_URL)."
      );
      process.exit(2);
    }
    candidates = buildCandidates(ref, password);
  }

  let client = null;
  let lastErr = null;
  for (const cs of candidates) {
    const label = String(cs).replace(/:[^:@/]+@/, ":****@");
    const c = new Client({
      connectionString: cs,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    });
    try {
      console.log("Tentando", label);
      await c.connect();
      client = c;
      console.log("Conectado.");
      break;
    } catch (err) {
      lastErr = err;
      console.error("FAIL:", label, err.message || err);
      try {
        await c.end();
      } catch {
        /* ignore */
      }
    }
  }

  if (!client) {
    throw lastErr || new Error("Nenhuma conexao funcionou.");
  }

  try {
    const sqlPath = path.join(
      process.cwd(),
      "docs/sql/gestao-documental-assinatura-ipecc.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Aplicando gestao-documental-assinatura-ipecc.sql ...");
    await client.query(sql);
    console.log("OK: SQL aplicado.");

    const providers = await client.query(
      "select code, name, ativo from gd_signature_providers order by code"
    );
    console.log("providers:", providers.rows);

    const tables = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (
          'gd_signature_evidences',
          'gd_signature_otp_challenges',
          'gd_validation_lookups'
        )
      order by table_name
    `);
    console.log(
      "tabelas ipecc:",
      tables.rows.map((r) => r.table_name).join(", ") || "(nenhuma)"
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Falha ao aplicar SQL:", err.message || err);
  process.exit(1);
});
