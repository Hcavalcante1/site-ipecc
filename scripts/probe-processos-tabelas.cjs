/**
 * Probe local: tabelas/colunas de Processos + Acessos + ciclo.
 * Uso: node scripts/probe-processos-tabelas.cjs
 * Le .env.local (nao imprime secrets).
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function checkTable(sb, name) {
  const { error } = await sb.from(name).select("*").limit(1);
  if (!error) return "OK";
  return `ERR ${error.code || ""} ${(error.message || "").slice(0, 140)}`;
}

async function checkColumn(sb, table, column) {
  const { error } = await sb.from(table).select(column).limit(1);
  if (!error) return "OK";
  return `ERR ${(error.message || "").slice(0, 140)}`;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !/^https?:\/\//i.test(url) || !key) {
    console.log("MISSING_OR_INVALID_ENV");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const tables = [
    "processos_contratacao",
    "admin_perfis",
    "admin_escopos",
    "editais",
    "noticias",
    "eventos",
    "propostas",
    "transparencia_convenios",
    "transparencia_editais",
    "transparencia_prestacao_contas",
  ];

  console.log("=== TABELAS ===");
  for (const t of tables) {
    console.log(`${t}: ${await checkTable(sb, t)}`);
  }

  console.log("=== COLUNAS processo_id / proposta_id ===");
  for (const t of [
    "editais",
    "noticias",
    "eventos",
    "transparencia_convenios",
    "transparencia_editais",
    "transparencia_prestacao_contas",
  ]) {
    console.log(`${t}.processo_id: ${await checkColumn(sb, t, "processo_id")}`);
  }
  console.log(
    `transparencia_convenios.proposta_id: ${await checkColumn(
      sb,
      "transparencia_convenios",
      "proposta_id"
    )}`
  );

  console.log("=== RPC ===");
  const { error: rpcErr } = await sb.rpc("is_admin_ou_perfil", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
  });
  console.log(
    `is_admin_ou_perfil: ${
      rpcErr ? `ERR ${(rpcErr.message || "").slice(0, 140)}` : "OK"
    }`
  );

  const { data: escoposCols, error: escErr } = await sb
    .from("admin_escopos")
    .select(
      "mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos"
    )
    .limit(1);
  console.log(
    `admin_escopos.mod_*: ${
      escErr ? `ERR ${(escErr.message || "").slice(0, 140)}` : "OK"
    }`
  );
}

main().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
