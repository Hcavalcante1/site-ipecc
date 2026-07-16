import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "@/lib/documentos/types";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/**
 * Baixa o original congelado ou o PDF assinado da transação.
 * ?tipo=original (padrão) | assinado
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const tipo = String(req.nextUrl.searchParams.get("tipo") || "original")
    .trim()
    .toLowerCase();

  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_cert_transactions")
    .select(
      "id, signer_user_id, original_storage_path, status, verification_code"
    )
    .eq("id", ctx.params.id)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json(
      { ok: false, error: "Sessão não encontrada." },
      { status: 404 }
    );
  }
  if (tx.signer_user_id !== auth.userId) {
    return NextResponse.json(
      { ok: false, error: "Apenas o signatário." },
      { status: 403 }
    );
  }

  let storagePath: string | null = null;
  let fileName = "documento.pdf";

  if (tipo === "assinado") {
    const { data: art } = await admin
      .from("gd_cert_artifacts")
      .select("storage_path")
      .eq("transaction_id", tx.id)
      .eq("artifact_type", "SIGNED_CERTIFICATE_DOCUMENT")
      .maybeSingle();
    storagePath = art?.storage_path || null;
    fileName =
      storagePath?.split("/").pop() ||
      `assinado-cert-${tx.verification_code || tx.id}.pdf`;
  } else {
    storagePath = tx.original_storage_path || null;
    fileName =
      String(tx.original_storage_path || "")
        .split("/")
        .pop() || "documento.pdf";
  }

  if (!storagePath) {
    return NextResponse.json(
      {
        ok: false,
        error:
          tipo === "assinado"
            ? "PDF assinado ainda não disponível."
            : "Transação sem caminho do original.",
      },
      { status: tipo === "assinado" ? 404 : 400 }
    );
  }

  const { data: file, error } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(storagePath);

  if (error || !file) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Arquivo indisponível." },
      { status: 404 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
