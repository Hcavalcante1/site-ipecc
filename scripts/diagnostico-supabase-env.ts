/**
 * Mostra qual projeto Supabase o .env.local aponta (sem expor chaves).
 * Uso: npm run diag:supabase-env
 */

import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

function refFromUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    return ref || host;
  } catch {
    return "(URL inválida)";
  }
}

async function main() {
  loadEnvLocal();
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ref = refFromUrl(url);

  console.log("Projeto Supabase (.env.local):");
  console.log("  ref:", ref);
  console.log("  host:", new URL(url).hostname);
  console.log("");
  console.log("Confira no Dashboard se este é o projeto STAGING.");
  console.log("Depois execute: docs/sql/proposta_anexos-M1-staging-APLICAR.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
