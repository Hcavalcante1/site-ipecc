/**
 * Diagnostico + liberacao de acesso admin para um e-mail Auth.
 * Padrao: papel operador (modulos via escopo). Use --mestre so para acesso total.
 * Uso: npx tsx scripts/grant-admin-perfil.ts email@dominio [--apply] [--mestre]
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/loadEnvLocal";

loadEnvLocal();

const email = (process.argv[2] || "").trim().toLowerCase();
const apply = process.argv.includes("--apply");
const asMestre = process.argv.includes("--mestre");
const papel = asMestre ? "mestre" : "operador";

if (!email) {
  console.error(
    "Uso: npx tsx scripts/grant-admin-perfil.ts email@dominio [--apply] [--mestre]"
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key);

async function main() {
  const { data: listed, error } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) {
    console.error("listUsers:", error.message);
    process.exit(1);
  }

  const user = (listed?.users || []).find(
    (u) => (u.email || "").toLowerCase() === email
  );

  if (!user) {
    console.log("RESULTADO: usuario NAO existe no Supabase Auth.");
    console.log("Crie o login em Authentication > Users e rode de novo.");
    process.exit(2);
  }

  console.log("Auth OK:", { id: user.id, email: user.email });

  const { data: perfilBefore } = await admin
    .from("admin_perfis")
    .select("user_id, email, papel, ativo")
    .eq("user_id", user.id)
    .maybeSingle();

  console.log("admin_perfis antes:", perfilBefore || null);

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, role, active")
    .eq("id", user.id)
    .maybeSingle();
  console.log("profiles:", profile || null);

  const { data: isAdmin } = await admin.rpc("is_admin", { user_id: user.id });
  const { data: gate } = await admin.rpc("is_admin_ou_perfil", {
    p_user_id: user.id,
  });
  console.log("is_admin:", isAdmin);
  console.log("is_admin_ou_perfil:", gate);

  if (gate === true && !apply) {
    console.log("\nJA AUTORIZADO — login deveria funcionar.");
    console.log(
      `Perfil atual: ${perfilBefore?.papel || "?"}. Para mudar: --apply [--mestre]`
    );
    return;
  }

  if (!apply) {
    console.log(
      "\nCAUSA: Auth existe, mas falta perfil admin (admin_perfis) e/ou is_admin."
    );
    console.log("Para liberar agora: adicione --apply no comando.");
    process.exit(3);
  }

  console.log(
    gate === true
      ? `\nAtualizando papel para ${papel}...`
      : "\nCAUSA: Auth existe, mas falta perfil admin. Aplicando..."
  );

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

  if (upErr) {
    console.error("Falha ao gravar admin_perfis:", upErr.message);
    process.exit(1);
  }

  console.log(`admin_perfis gravado como ${papel}.`);
  if (papel !== "mestre") {
    console.log(
      "Proximo passo: em /admin/acessos, vincule processo + modulos (editais, propostas, etc.)."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
