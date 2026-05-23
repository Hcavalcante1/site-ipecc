/**
 * Validação local M3: fluxo público + API sync (com flags no .env.local).
 * Complementa smoke no browser; grava proposta_id para conferência admin.
 *
 * Uso: npm run validar:fluxo-publico-m3
 * Requer: npm run dev (porta em DEV_URL ou 3000–3002)
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/loadEnvLocal";

const DEV_URL = process.env.DEV_URL || "http://localhost:3002";

async function main() {
  loadEnvLocal();
  requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  );

  const flags = {
    USE_PROPOSTA_ANEXOS_TABLE: process.env.USE_PROPOSTA_ANEXOS_TABLE,
    USE_PROPOSTA_ANEXOS_ESCRITA: process.env.USE_PROPOSTA_ANEXOS_ESCRITA,
    NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_ESCRITA:
      process.env.NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_ESCRITA,
    NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_TABLE:
      process.env.NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_TABLE,
  };

  console.log("Flags (.env.local):", flags);

  if (flags.USE_PROPOSTA_ANEXOS_ESCRITA !== "true") {
    console.error("FALHA: USE_PROPOSTA_ANEXOS_ESCRITA deve ser true");
    process.exit(1);
  }
  if (flags.NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_ESCRITA !== "true") {
    console.error("FALHA: NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_ESCRITA deve ser true");
    process.exit(1);
  }

  const pdfPath = path.join(process.cwd(), "reports", "test-proposta-staging.pdf");
  if (!fs.existsSync(pdfPath)) {
    console.error("Ausente:", pdfPath);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const storagePath = `${stamp}-proposta-validacao-m3-local.pdf`;
  const email = `m3-local-${stamp}@example.com`;
  const nome = `Validacao M3 local ${stamp}`;

  console.log("1) Upload storage...");
  const buffer = fs.readFileSync(pdfPath);
  const { error: upErr } = await supabase.storage
    .from("propostas")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });
  if (upErr) {
    console.error("FALHA storage:", upErr.message);
    process.exit(1);
  }
  console.log("   OK", storagePath);

  console.log("2) Insert propostas (legado)...");
  const { data: inserida, error: insErr } = await supabase
    .from("propostas")
    .insert({
      nome,
      cnpj: "12345678000199",
      email,
      telefone: "11999999999",
      mensagem: "Validacao humana M3 local — flags ligadas",
      tipo: "pessoa_juridica",
      categoria: "habilitacao_juridica",
      arquivo_url: storagePath,
    })
    .select("id, email, arquivo_url")
    .single();

  if (insErr || !inserida?.id) {
    console.error("FALHA insert:", insErr?.message);
    process.exit(1);
  }
  console.log("   OK proposta_id:", inserida.id);

  console.log("3) API registrar-anexos (escrita dupla)...");
  const apiRes = await fetch(`${DEV_URL}/api/propostas/registrar-anexos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propostaId: inserida.id, email }),
  });
  const apiJson = (await apiRes.json()) as {
    ok?: boolean;
    skipped?: boolean;
    linhas?: number;
    error?: string;
  };

  if (!apiRes.ok || !apiJson.ok) {
    console.error("FALHA API:", apiRes.status, apiJson);
    process.exit(1);
  }
  if (apiJson.skipped) {
    console.error("FALHA: API retornou skipped — USE_PROPOSTA_ANEXOS_ESCRITA off no servidor");
    process.exit(1);
  }
  console.log("   OK linhas:", apiJson.linhas);

  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: anexos, error: anexErr } = await admin
    .from("proposta_anexos")
    .select("id, chave, storage_path, origem, status")
    .eq("proposta_id", inserida.id)
    .eq("status", "ativo");

  if (anexErr) {
    console.error("FALHA leitura proposta_anexos:", anexErr.message);
    process.exit(1);
  }

  const linha = (anexos || []).find((a) => a.storage_path === storagePath);
  if (!linha) {
    console.error("FALHA: linha em proposta_anexos não encontrada para", storagePath);
    process.exit(1);
  }
  console.log("4) proposta_anexos OK:", linha.chave, linha.origem);

  console.log("\n--- Conferir no browser ---");
  console.log("Admin listagem:", `${DEV_URL}/admin/propostas`);
  console.log("Detalhe:", `${DEV_URL}/admin/propostas/${inserida.id}`);
  console.log("Download:", `${DEV_URL}/api/download/public/propostas/${storagePath}`);
  console.log("E-mail busca:", email);
  console.log("\nOK: fluxo público M3 (insert + sync API + tabela).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
