/**
 * Aplica SQL da assinatura avançada + gera chaves locais se faltarem.
 * Uso: node scripts/aplicar-assinatura-avancada-sql.cjs
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return envPath;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    }
  }
  return envPath;
}

function buildCandidates(ref, password) {
  const enc = encodeURIComponent(password);
  const regions = [
    "sa-east-1",
    "us-east-1",
    "us-east-2",
    "us-west-2",
    "eu-west-1",
  ];
  const out = [];
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      out.push(
        `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:${port}/postgres`
      );
    }
  }
  out.push(`postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`);
  return out;
}

function ensureLocalKeys(envPath) {
  let raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const has = (k) => new RegExp(`^${k}=`, "m").test(raw);
  const append = [];

  if (!has("SIGNATURE_OTP_PEPPER")) {
    const pepper = crypto.randomBytes(32).toString("hex");
    append.push(`SIGNATURE_OTP_PEPPER=${pepper}`);
    process.env.SIGNATURE_OTP_PEPPER = pepper;
    console.log("Gerado SIGNATURE_OTP_PEPPER em .env.local");
  }

  if (!has("SIGNATURE_ADV_PRIVATE_KEY_PEM")) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
    const priv = privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString()
      .replace(/\n/g, "\\n");
    const pub = publicKey
      .export({ type: "spki", format: "pem" })
      .toString()
      .replace(/\n/g, "\\n");
    append.push(`SIGNATURE_ADV_KEY_VERSION=v1`);
    append.push(`SIGNATURE_ADV_PRIVATE_KEY_PEM="${priv}"`);
    append.push(`SIGNATURE_ADV_PUBLIC_KEY_PEM="${pub}"`);
    process.env.SIGNATURE_ADV_PRIVATE_KEY_PEM = priv.replace(/\\n/g, "\n");
    process.env.SIGNATURE_ADV_PUBLIC_KEY_PEM = pub.replace(/\\n/g, "\n");
    process.env.SIGNATURE_ADV_KEY_VERSION = "v1";
    console.log("Gerado par Ed25519 SIGNATURE_ADV_* em .env.local");
  }

  if (!has("SIGNATURE_OTP_ALLOW_PANEL_FALLBACK")) {
    append.push("SIGNATURE_OTP_ALLOW_PANEL_FALLBACK=true");
    console.log(
      "Definido SIGNATURE_OTP_ALLOW_PANEL_FALLBACK=true (operacional local)"
    );
  }

  if (append.length) {
    const block =
      (raw.endsWith("\n") || !raw ? "" : "\n") +
      "\n# --- Assinatura IPECC (gerado automaticamente) ---\n" +
      append.join("\n") +
      "\n";
    fs.appendFileSync(envPath, block, "utf8");
  }
}

async function probeWithServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Probe REST: sem URL/service role");
    return;
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  console.log("\n=== Probe REST (service role) ===");
  for (const table of [
    "gd_signature_evidences",
    "gd_adv_transactions",
    "gd_adv_identity_verifications",
    "gd_adv_batches",
    "gd_adv_events",
    "gd_adv_artifacts",
  ]) {
    const { error } = await sb.from(table).select("*").limit(1);
    if (error) {
      console.log(
        `${table}: AUSENTE/ERRO [${error.code || "?"}] ${error.message}`
      );
    } else {
      console.log(`${table}: OK`);
    }
  }
}

async function applySql() {
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
        "\nSQL direto: falta SUPABASE_DB_PASSWORD (ou DATABASE_URL) no .env.local."
      );
      console.error(
        "Defina a senha do banco do painel Supabase e rode de novo este script."
      );
      return false;
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
      connectionTimeoutMillis: 15000,
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
    console.error("Nenhuma conexão Postgres:", lastErr?.message || lastErr);
    return false;
  }

  try {
    const sqlPath = path.join(
      process.cwd(),
      "docs/sql/gestao-documental-assinatura-avancada.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Aplicando gestao-documental-assinatura-avancada.sql ...");
    await client.query(sql);
    console.log("OK: SQL avançado aplicado.");

    const tables = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name like 'gd_adv_%'
      order by table_name
    `);
    console.log(
      "tabelas gd_adv_*:",
      tables.rows.map((r) => r.table_name).join(", ") || "(nenhuma)"
    );
    return true;
  } finally {
    await client.end();
  }
}

async function main() {
  const envPath = loadEnvLocal();
  ensureLocalKeys(envPath);
  const applied = await applySql();
  await probeWithServiceRole();
  if (!applied) process.exitCode = 2;
}

main().catch((err) => {
  console.error("Falha:", err.message || err);
  process.exit(1);
});
