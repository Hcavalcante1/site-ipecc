/**
 * M3.2 — Valida sync admin (origem admin) após alteração em coluna *_url.
 * Não altera UI; simula correção operacional via service role + API lógica.
 *
 * Uso: USE_PROPOSTA_ANEXOS_ESCRITA=true npm run validar:sync-admin-anexos
 * Opcional: DEV_URL=http://localhost:3002 (testa rota HTTP se dev ativo)
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
    "SUPABASE_SERVICE_ROLE_KEY",
    "USE_PROPOSTA_ANEXOS_ESCRITA"
  );

  if (process.env.USE_PROPOSTA_ANEXOS_ESCRITA !== "true") {
    console.error("FALHA: USE_PROPOSTA_ANEXOS_ESCRITA deve ser true");
    process.exit(1);
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const stamp = Date.now();
  const pathBase = `${stamp}-proposta-base.pdf`;
  const pathAdmin = `${stamp}-admin-sync-test.pdf`;

  const pdfPath = path.join(process.cwd(), "reports", "test-proposta-staging.pdf");
  if (!fs.existsSync(pdfPath)) {
    console.error("Ausente:", pdfPath);
    process.exit(1);
  }
  const buffer = fs.readFileSync(pdfPath);

  for (const storagePath of [pathBase, pathAdmin]) {
    const { error: upErr } = await admin.storage
      .from("propostas")
      .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });
    if (upErr) {
      console.error("FALHA upload storage:", storagePath, upErr.message);
      process.exit(1);
    }
  }

  const { data: criada, error: insErr } = await admin
    .from("propostas")
    .insert({
      nome: `Admin sync test ${stamp}`,
      cnpj: "12345678000199",
      email: `admin-sync-${stamp}@example.com`,
      telefone: "11999999999",
      mensagem: "M3.2 validar sync admin",
      tipo: "pessoa_juridica",
      categoria: "habilitacao_juridica",
      arquivo_url: pathBase,
    })
    .select("id")
    .single();

  if (insErr || !criada?.id) {
    console.error("FALHA insert:", insErr?.message);
    process.exit(1);
  }

  const propostaId = criada.id;

  const { error: upErr } = await admin
    .from("propostas")
    .update({ cnpj_url: pathAdmin })
    .eq("id", propostaId);

  if (upErr) {
    console.error("FALHA update coluna:", upErr.message);
    process.exit(1);
  }

  const { sincronizarAnexosPropostaTabela } = await import(
    "../lib/documental/propostaAnexosEscrita"
  );

  const { data: row } = await admin.from("propostas").select("*").eq("id", propostaId).single();

  const sync = await sincronizarAnexosPropostaTabela(
    admin,
    propostaId,
    (row || {}) as Record<string, unknown>,
    "admin"
  );

  if (!sync.ok) {
    console.error("FALHA sync:", sync.error);
    process.exit(1);
  }

  const { data: linha } = await admin
    .from("proposta_anexos")
    .select("chave, storage_path, origem")
    .eq("proposta_id", propostaId)
    .eq("storage_path", pathAdmin)
    .maybeSingle();

  if (!linha || linha.origem !== "admin") {
    console.error("FALHA: linha admin não encontrada ou origem incorreta", linha);
    process.exit(1);
  }

  console.log("OK sync direto — origem:", linha.origem, "chave:", linha.chave);

  try {
    const res = await fetch(`${DEV_URL}/api/admin/propostas/sincronizar-anexos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propostaId }),
    });
    const json = await res.json();
    if (res.status === 401 || res.status === 403) {
      console.log(
        "AVISO: rota admin exige sessão — HTTP",
        res.status,
        "(esperado sem cookie; lógica validada via service role)"
      );
    } else if (res.ok && json.ok) {
      console.log("OK rota HTTP — linhas:", json.linhas ?? 0);
    } else if (!res.ok) {
      console.log("AVISO rota HTTP:", res.status, json);
    }
  } catch {
    console.log("AVISO: dev server indisponível em", DEV_URL, "— pulando teste HTTP");
  }

  console.log("proposta_id:", propostaId);
  console.log("OK: M3.2 sync admin (coluna + proposta_anexos).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
