import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import { obterLinkAssinaturaDocumento } from "@/lib/documentos/signatureService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { carregarDocumentoNoEscopo } from "@/lib/documentos/scopeHelper";

/** GET /api/admin/documentos/assinaturas/[id]/link — reabre embed no admin. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  const { data: sig } = await admin
    .from("gd_signature_documents")
    .select("id, document_id, provider_code, status")
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

  if (sig.status === "signed") {
    return NextResponse.json({
      ok: true,
      signed: true,
      signingUrl: null,
      embedUrl: null,
    });
  }

  const links = await obterLinkAssinaturaDocumento({
    signatureDocumentId: id,
    signerEmail: auth.contexto.email,
  });

  if (links.error) {
    return NextResponse.json(
      { ok: false, error: links.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    signed: false,
    signingUrl: links.signingUrl,
    embedUrl: links.embedUrl,
    token: links.token,
  });
}
