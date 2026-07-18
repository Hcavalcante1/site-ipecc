const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  if (!process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/^'|'$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Falta URL ou SERVICE_ROLE");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  const { data, error } = await sb
    .from("documentos_tipos")
    .select("codigo,label")
    .limit(5);
  if (error) {
    console.log("STATUS", error.code || "", error.message);
    process.exit(2);
  }
  console.log("STATUS ok sample", (data || []).length);
  console.log((data || []).map((r) => r.codigo).join(","));
})().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
