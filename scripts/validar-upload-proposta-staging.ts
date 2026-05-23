/**
 * Validação operacional: upload + insert (mesmo client que /propostas).
 * Uso: npx --yes tsx scripts/validar-upload-proposta-staging.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

async function main() {
  loadEnvLocal();
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  if (process.env.USE_PROPOSTA_ANEXOS_ESCRITA === "true" && data?.id) {
    console.log("2b) Sincronizar proposta_anexos (escrita dupla)...");
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: row } = await admin.from("propostas").select("*").eq("id", data.id).single();
    const { sincronizarAnexosPropostaTabela } = await import(
      "../lib/documental/propostaAnexosEscrita"
    );
    const sync = await sincronizarAnexosPropostaTabela(
      admin,
      data.id,
      (row || {}) as Record<string, unknown>,
      "upload_publico"
    );
    if (!sync.ok) {
      console.error("FALHA SYNC proposta_anexos:", sync.error);
      process.exit(1);
    }
    console.log("   OK linhas sincronizadas:", sync.linhas);
  }

  console.log("3) Storage download (mesmo caminho da API /api/download)...");
  const { downloadArquivoProposta } = await import("../lib/storage/propostasBucket");
  const dl = await downloadArquivoProposta(storagePath);
  if ("error" in dl) {
    console.error("FALHA DOWNLOAD STORAGE:", dl.error);
    process.exit(1);
  }
  const bytes = (await dl.data.arrayBuffer()).byteLength;
  console.log("   OK bytes:", bytes, "path:", dl.pathUsado);

  console.log("4) Conferir: npm run audit:anexos e /admin/propostas");
  console.log("   Download API (sessão admin): /api/download/propostas/" + storagePath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
