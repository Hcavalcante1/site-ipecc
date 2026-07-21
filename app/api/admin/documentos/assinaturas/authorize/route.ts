import { NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const { denied } = await denyIfSemModuloDocumentos();
  if (denied) return denied;

  return NextResponse.json(
    {
      ok: false,
      error: "Fluxo de autorização desativado. Use assinatura no admin ou certificado digital.",
    },
    { status: 410 }
  );
}
