import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/loadEnvLocal";

loadEnvLocal();

const USER_ID = "65f35215-e749-4cd9-8668-762c9b0aa45b";
const PROCESSO_ID = "488d5c05-048c-44c3-81ed-9d551cae4135";

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existing } = await admin
    .from("admin_escopos")
    .select("id")
    .eq("user_id", USER_ID)
    .eq("processo_id", PROCESSO_ID)
    .maybeSingle();

  if (existing) {
    console.log("Escopo ja existe:", existing.id);
    return;
  }

  const { data, error } = await admin
    .from("admin_escopos")
    .insert({
      user_id: USER_ID,
      processo_id: PROCESSO_ID,
      modalidade: null,
      mod_editais: true,
      mod_propostas: true,
      mod_transparencia: true,
      mod_noticias: true,
      mod_eventos: true,
      mod_projetos: true,
    })
    .select("id, user_id, processo_id")
    .single();

  if (error) {
    console.error("ERRO insert:", error);
    process.exit(1);
  }
  console.log("Escopo criado:", data);
}

main();
