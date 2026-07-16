import { NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "@/lib/documentos/types";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/**
 * Baixa exatamente o PDF congelado na transação de certificado
 * (original_storage_path), alinhado ao hash da sessão.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_cert_transactions")
    .select("id, signer_user_id, original_storage_path, status")
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
  if (!tx.original_storage_path) {
    return NextResponse.json(
      { ok: false, error: "Transação sem caminho do original." },
      { status: 400 }
    );
  }

  const { data: file, error } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(tx.original_storage_path);

  if (error || !file) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Arquivo indisponível." },
      { status: 404 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name =
    String(tx.original_storage_path).split("/").pop() || "documento.pdf";

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
