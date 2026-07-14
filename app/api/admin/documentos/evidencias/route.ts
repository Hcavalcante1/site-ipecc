import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";
import { listarEvidenciasAssinatura } from "@/lib/documentos/signing/laudoService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const documentId = req.nextUrl.searchParams.get("documentId") || undefined;
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") || "50");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 50;

  const result = await listarEvidenciasAssinatura({ documentId, limit });
  if (result.ok === false) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  const evidencias = result.evidencias.filter((row) =>
    registroNoEscopoProcesso(row.processo_id, processoIds)
  );

  return NextResponse.json({
    ok: true,
    evidencias,
    ...(result.aviso ? { aviso: result.aviso } : {}),
  });
}
