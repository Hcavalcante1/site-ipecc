import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import { getCertificateProfileBytes } from "@/lib/documentos/assinaturas/certificate/certificateVaultService";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const result = await getCertificateProfileBytes({
    profileId: ctx.params.id,
    ownerUserId: auth.userId,
  });
  if (result.ok === false) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status || 500 }
    );
  }

  const fileName = `${result.profile.label || result.profile.source_filename || "certificado"}.pfx`
    .replace(/\s+/g, " ")
    .replace(/"/g, "");

  return new NextResponse(result.bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/x-pkcs12",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
