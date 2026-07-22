import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "@/lib/documentos/types";
import { buscarEvidenciaPorCodigo } from "@/lib/documentos/signing/evidenceService";
import { requestAuditMeta } from "@/lib/documentos/auditMeta";
import {
  RATE_VALIDAR_PUBLICO,
  checkRateLimit,
  mensagemRateLimit,
  validarPublicoRateKey,
} from "@/lib/documentos/signing/rateLimit";

export const dynamic = "force-dynamic";

type Ctx = { params: { codigo: string } };

/**
 * Download público do PDF assinado via domínio IPECC.
 * Ex.: /api/download/assinatura/D62BE81D47B0
 * (equivale aos downloads públicos de transparência — sem URL do Supabase)
 */
export async function GET(req: Request, { params }: Ctx) {
  const meta = requestAuditMeta(req);
  const rate = await checkRateLimit(
    validarPublicoRateKey(meta.ip),
    RATE_VALIDAR_PUBLICO
  );
  if (rate.limited) {
    return new NextResponse(mensagemRateLimit(rate.retryAfterSec), {
      status: 429,
    });
  }

  const codigo = String(params.codigo || "")
    .trim()
    .toUpperCase();
  if (!codigo || codigo.length < 6) {
    return new NextResponse("Código inválido", { status: 400 });
  }

  const { data: evidencia, error } = await buscarEvidenciaPorCodigo(codigo);
  if (error) {
    return new NextResponse("Erro ao buscar evidência", { status: 500 });
  }

  const admin = getSupabaseAdmin();
  let storagePath = evidencia?.signed_storage_path || null;
  let fileNameHint = storagePath?.split("/").pop() || `assinado-${codigo}.pdf`;

  if (!storagePath) {
    const { data: tx } = await admin
      .from("gd_adv_transactions")
      .select("id, status")
      .eq("verification_code", codigo)
      .eq("status", "COMPLETED")
      .maybeSingle();
    if (tx?.id) {
      const { data: art } = await admin
        .from("gd_adv_artifacts")
        .select("storage_path")
        .eq("transaction_id", tx.id)
        .eq("artifact_type", "SIGNED_ADVANCED_DOCUMENT")
        .maybeSingle();
      storagePath = art?.storage_path || null;
      fileNameHint = storagePath?.split("/").pop() || `avancado-${codigo}.pdf`;
    }
  }

  if (!storagePath) {
    const { data: ctx } = await admin
      .from("gd_cert_transactions")
      .select("id, status")
      .eq("verification_code", codigo)
      .eq("status", "COMPLETED")
      .maybeSingle();
    if (ctx?.id) {
      const { data: art } = await admin
        .from("gd_cert_artifacts")
        .select("storage_path")
        .eq("transaction_id", ctx.id)
        .eq("artifact_type", "SIGNED_CERTIFICATE_DOCUMENT")
        .maybeSingle();
      storagePath = art?.storage_path || null;
      fileNameHint = storagePath?.split("/").pop() || `certificado-${codigo}.pdf`;
    }
  }

  if (!storagePath) {
    return new NextResponse("Documento assinado não encontrado", {
      status: 404,
    });
  }

  const { data: file, error: dlErr } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(storagePath);

  if (dlErr || !file) {
    return new NextResponse("Arquivo indisponível", { status: 404 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileNameHint}"`,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
