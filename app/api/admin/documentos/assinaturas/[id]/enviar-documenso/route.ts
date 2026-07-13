import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos, requestAuditMeta } from "@/lib/documentos";
import { enviarParaAssinaturaDocumenso } from "@/lib/documentos/signatureService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { carregarDocumentoNoEscopo } from "@/lib/documentos/scopeHelper";

/**
 * POST /api/admin/documentos/assinaturas/[id]/enviar-documenso
 * Cria/envia envelope no Documenso para um pedido já existente.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  const { data: sig } = await admin
    .from("gd_signature_documents")
    .select("id, document_id, provider_code")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "Pedido de assinatura não encontrado." },
      { status: 404 }
    );
  }

  const loaded = await carregarDocumentoNoEscopo(sig.document_id, auth);
  if (loaded.error) return loaded.error;

  let body: { signer_email?: string; signer_name?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const meta = requestAuditMeta(req);
  const result = await enviarParaAssinaturaDocumenso({
    signatureDocumentId: id,
    userId: auth.userId,
    actorEmail: auth.contexto.email,
    ip: meta.ip,
    userAgent: meta.user_agent,
    signerEmail: body.signer_email,
    signerName: body.signer_name,
  });

  if (result.error) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, signature: result.data });
}
