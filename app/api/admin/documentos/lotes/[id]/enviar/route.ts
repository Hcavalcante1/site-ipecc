import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos, requestAuditMeta } from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";
import {
  BATCH_SELECT,
  enviarLoteParaAssinaturaDocumento,
} from "@/lib/documentos/signatureService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/documentos/lotes/[id]/enviar
 * Envia todos os itens do lote para assinatura Documento.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  const { data: batch } = await admin
    .from("gd_signature_batches")
    .select(BATCH_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!batch) {
    return NextResponse.json(
      { ok: false, error: "Lote não encontrado." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(batch.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Lote fora do seu escopo." },
      { status: 403 }
    );
  }

  let body: { signer_email?: string; signer_name?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const meta = requestAuditMeta(req);
  const result = await enviarLoteParaAssinaturaDocumento({
    batchId: id,
    userId: auth.userId,
    actorEmail: auth.contexto.email,
    ip: meta.ip,
    userAgent: meta.user_agent,
    signerEmail: body.signer_email || "",
    signerName: body.signer_name,
  });

  if (result.error && !result.data?.done) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    result: result.data,
    aviso: result.error || undefined,
  });
}
