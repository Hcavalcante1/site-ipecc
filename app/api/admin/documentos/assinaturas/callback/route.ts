import { NextRequest, NextResponse } from "next/server";
import { concluirCallbackGovBr } from "@/lib/documentos/signatureService";

/**
 * Callback OAuth2 gov.br (redirect do CAS).
 * Não exige sessão no mesmo formato das APIs JSON — o state amarra o usuário.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin;

  if (oauthError) {
    return NextResponse.redirect(
      `${base}/admin/documentos/assinaturas?erro=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${base}/admin/documentos/assinaturas?erro=${encodeURIComponent("Parâmetros OAuth ausentes.")}`
    );
  }

  try {
    const result = await concluirCallbackGovBr({ code, state });
    if ("error" in result && result.error) {
      return NextResponse.redirect(
        `${base}/admin/documentos/assinaturas?erro=${encodeURIComponent(result.error)}`
      );
    }

    const qs = new URLSearchParams({
      ok: "1",
      state,
    });
    if (result.signatureDocumentId) {
      qs.set("signature_id", result.signatureDocumentId);
    }
    if (result.batchId) {
      qs.set("batch_id", result.batchId);
    }
    return NextResponse.redirect(
      `${base}/admin/documentos/assinaturas?${qs.toString()}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha no callback gov.br";
    return NextResponse.redirect(
      `${base}/admin/documentos/assinaturas?erro=${encodeURIComponent(msg)}`
    );
  }
}
