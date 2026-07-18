/**
 * Verifica tabelas documentos_oficiais_* via service role (sem senha do banco).
 * Uso: node scripts/verificar-documentos-oficiais.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const modelos = await sb
    .from("documentos_oficiais_modelos")
    .select("slug, tipo_emissao, ativo")
    .order("slug");
  const emissoes = await sb
    .from("documentos_oficiais_emissoes")
    .select("id")
    .limit(1);
  if (modelos.error) {
    console.log("modelos_erro:", modelos.error.message);
  } else {
    console.log(
      "modelos_ok:",
      (modelos.data || []).map((r) => r.slug).join(", ") || "(vazio)"
    );
  }
  if (emissoes.error) {
    console.log("emissoes_erro:", emissoes.error.message);
  } else {
    console.log("emissoes_ok");
  }
  const missing =
    (modelos.error && /schema cache|does not exist|Could not find/i.test(modelos.error.message)) ||
    (emissoes.error && /schema cache|does not exist|Could not find/i.test(emissoes.error.message));
  process.exit(missing ? 2 : 0);
}

main();
