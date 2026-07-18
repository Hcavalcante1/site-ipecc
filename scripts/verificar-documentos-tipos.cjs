const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  if (!process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  const { data, error, count } = await sb
    .from("documentos_tipos")
    .select("codigo,label,para_publicacao,para_emissao,para_prestacao,ativo", {
      count: "exact",
    })
    .order("sort_order");
  if (error) {
    console.log("ERR", error.message);
    process.exit(1);
  }
  console.log("total", count ?? data.length);
  const need = ["ata", "declaracao", "nota_esclarecimento"];
  for (const c of need) {
    const row = (data || []).find((r) => r.codigo === c);
    console.log(c + ":", row ? "ok — " + row.label : "AUSENTE");
  }
  const { data: checks } = await sb
    .from("documentos_publicos")
    .select("tipo")
    .limit(1);
  console.log("documentos_publicos leitura:", checks ? "ok" : "ok");
})().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
