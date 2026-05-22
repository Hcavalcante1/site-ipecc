/**
 * Operacional Bloco A: remove referência órfã da proposta de teste (arquivo inexistente).
 * Uso: npx --yes tsx scripts/limpar-orfao-proposta-teste.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const ID_TESTE = "9e265fc7-3cca-4b51-8a20-e5e13ac8be73";

function carregarEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.trimStart().startsWith("#")) continue;
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

async function main() {
  carregarEnvLocal();
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
