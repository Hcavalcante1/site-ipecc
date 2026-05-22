/**
 * Validação operacional: upload + insert (mesmo client que /propostas).
 * Uso: npx --yes tsx scripts/validar-upload-proposta-staging.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function carregarEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) throw new Error(".env.local não encontrado");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.trimStart().startsWith("#")) continue;
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

async function main() {
  carregarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Variáveis públicas Supabase ausentes");

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const pdfPath = path.join(process.cwd(), "reports", "test-proposta-staging.pdf");
  if (!fs.existsSync(pdfPath)) throw new Error("reports/test-proposta-staging.pdf ausente");

  const stamp = Date.now();
  const storagePath = `${stamp}-proposta-staging-validacao.pdf`;
  const buffer = fs.readFileSync(pdfPath);

  console.log("1) Storage upload (bucket propostas)...");
  const { error: upErr } = await supabase.storage
    .from("propostas")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });

  if (upErr) {
    console.error("FALHA UPLOAD:", upErr.message);
    process.exit(1);
  }
  console.log("   OK path:", storagePath);

  const email = `staging-validacao-${stamp}@example.com`;
  console.log("2) Insert propostas...");
  const { data, error: insErr } = await supabase
    .from("propostas")
    .insert({
      nome: `Staging validacao ${stamp}`,
      cnpj: "12345678000199",
      email,
      telefone: "11999999999",
      mensagem: "Teste automatizado validar-upload-proposta-staging",
      tipo: "pessoa_juridica",
      categoria: "habilitacao_juridica",
      arquivo_url: storagePath,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("FALHA INSERT:", insErr.message);
    process.exit(1);
  }

  console.log("   OK proposta_id:", data?.id);
  console.log("3) Conferir: npm run audit:anexos e /admin/propostas");
  console.log("   Download admin: /api/download/propostas/" + storagePath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
