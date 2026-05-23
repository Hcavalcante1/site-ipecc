/**
 * Operacional Bloco A: remove referência órfã da proposta de teste (arquivo inexistente).
 * Uso: npx --yes tsx scripts/limpar-orfao-proposta-teste.ts
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

const ID_TESTE = "9e265fc7-3cca-4b51-8a20-e5e13ac8be73";

async function main() {
  loadEnvLocal();
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key);

  const { data, error } = await admin
    .from("propostas")
    .update({ arquivo_url: null })
    .eq("id", ID_TESTE)
    .select("id, arquivo_url")
    .single();

  if (error) throw error;
  console.log("Proposta teste atualizada:", data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
