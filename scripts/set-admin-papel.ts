/**
 * Ajusta papel do admin (ex.: mestre -> operador) sem apagar escopos.
 * Uso: npx tsx scripts/set-admin-papel.ts email@dominio operador
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/loadEnvLocal";

loadEnvLocal();

const email = (process.argv[2] || "").trim().toLowerCase();
const papel = (process.argv[3] || "").trim().toLowerCase();
const PAPELS = new Set(["mestre", "operador", "externo"]);

if (!email || !PAPELS.has(papel)) {
  console.error(
    "Uso: npx tsx scripts/set-admin-papel.ts email@dominio mestre|operador|externo"
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, key);

async function main() {
  const { data: listed, error } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;

  const user = (listed?.users || []).find(
    (u) => (u.email || "").toLowerCase() === email
  );
  if (!user) {
    console.error("Usuario Auth nao encontrado:", email);
    process.exit(2);
  }

  const { data: before } = await admin
    .from("admin_perfis")
    .select("user_id, email, papel, ativo")
    .eq("user_id", user.id)
    .maybeSingle();
  console.log("antes:", before);

  const { error: upErr } = await admin.from("admin_perfis").upsert(
    {
      user_id: user.id,
      email: user.email ?? email,
      papel,
      ativo: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (upErr) throw upErr;

  // Evita is_admin legado promover a mestre de novo
  await admin
    .from("profiles")
    .update({ role: "user", active: true })
    .eq("id", user.id);

  const { data: escopos } = await admin
    .from("admin_escopos")
    .select(
      "id, processo_id, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos"
    )
    .eq("user_id", user.id);

  const { data: after } = await admin
    .from("admin_perfis")
    .select("user_id, email, papel, ativo")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: isAdmin } = await admin.rpc("is_admin", { user_id: user.id });
  const { data: gate } = await admin.rpc("is_admin_ou_perfil", {
    p_user_id: user.id,
  });

  console.log("depois:", after);
  console.log("escopos:", escopos || []);
  console.log("is_admin:", isAdmin, "| is_admin_ou_perfil:", gate);
  if (!escopos || escopos.length === 0) {
    console.log(
      "AVISO: sem escopo de processo/modulos. Em /admin/acessos, vincule um processo e marque os modulos."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
