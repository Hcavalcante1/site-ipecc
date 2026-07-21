import { NextRequest, NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const base = getPublicSiteUrl() || req.nextUrl.origin;
  return NextResponse.redirect(
    `${base}/admin/documentos/assinaturas?erro=${encodeURIComponent(
      "Fluxo de autorização desativado."
    )}`
  );
}
