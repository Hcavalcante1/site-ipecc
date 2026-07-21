import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const { denied } = await denyIfSemModuloDocumentos();
  if (denied) return denied;

  return NextResponse.json(
    {
      ok: false,
      error: "Fluxo de assinatura por autorização externa desativado.",
    },
    { status: 410 }
  );
}
