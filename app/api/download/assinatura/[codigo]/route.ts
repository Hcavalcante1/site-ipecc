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
  const rate = checkRateLimit(
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
  if (!evidencia?.signed_storage_path) {
    return new NextResponse("Documento assinado não encontrado", {
      status: 404,
    });
  }

  const admin = getSupabaseAdmin();
  const { data: file, error: dlErr } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(evidencia.signed_storage_path);

  if (dlErr || !file) {
    return new NextResponse("Arquivo indisponível", { status: 404 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const fileName =
    evidencia.signed_storage_path.split("/").pop() ||
    `assinado-${codigo}.pdf`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
