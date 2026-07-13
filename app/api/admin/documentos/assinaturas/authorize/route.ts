import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import { iniciarAutorizeGovBr } from "@/lib/documentos/signatureService";

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      signature_document_id?: string;
      batch_id?: string;
      scope?: "sign" | "signature_session";
    };

    const result = await iniciarAutorizeGovBr({
      userId: auth.userId,
      signatureDocumentId: body.signature_document_id || null,
      batchId: body.batch_id || null,
      scope: body.scope,
    });

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      authorizationUrl: result.authorizationUrl,
      state: result.state,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao autorizar gov.br.",
      },
      { status: 500 }
    );
  }
}
