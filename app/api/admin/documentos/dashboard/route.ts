import { NextRequest, NextResponse } from "next/server";
import {
  denyIfSemModuloDocumentos,
  contarDashboard,
} from "@/lib/documentos";
import { processoIdsDoEscopo } from "@/lib/auth/adminEscopo";

export async function GET(_req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const processoIds = processoIdsDoEscopo(auth.contexto);
  const { counts, aviso } = await contarDashboard(processoIds);

  return NextResponse.json({
    ok: true,
    counts,
    ...(aviso ? { aviso } : {}),
  });
}
