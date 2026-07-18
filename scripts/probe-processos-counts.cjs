const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const e = fs.readFileSync(".env.local", "utf8");
function get(k) {
  const m = e.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
(async () => {
  for (const t of ["admin_perfis", "processos_contratacao", "admin_escopos"]) {
    const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
    console.log(t + "_count=" + (error ? "ERR" : count));
  }
})();
