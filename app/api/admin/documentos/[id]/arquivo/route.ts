import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDocumentos } from "@/lib/documentos";
import { carregarDocumentoNoEscopo } from "@/lib/documentos/scopeHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "@/lib/documentos/types";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

function contentTypeFromName(name: string | null | undefined) {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

/**
 * Stream do arquivo pelo domínio IPECC (admin autenticado).
 * GET /api/admin/documentos/{id}/arquivo
 * ?versao=atual|assinado — assinado usa a evidência IPECC mais recente.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const id = ctx.params.id;
  const loaded = await carregarDocumentoNoEscopo(id, auth);
  if (loaded.error) return loaded.error;
  const doc = loaded.data!;

  const tipo = String(req.nextUrl.searchParams.get("versao") || "atual")
    .trim()
    .toLowerCase();

  const admin = getSupabaseAdmin();
  let storagePath = doc.storage_path as string | null;
  let fileName = doc.file_name as string | null;

  if (tipo === "assinado") {
    const { data: evid } = await admin
      .from("gd_signature_evidences")
      .select("signed_storage_path, validation_code")
      .eq("document_id", id)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!evid?.signed_storage_path) {
      return NextResponse.json(
        { ok: false, error: "Nenhuma versão assinada encontrada." },
        { status: 404 }
      );
    }
    storagePath = evid.signed_storage_path;
    fileName = `assinado-${evid.validation_code}.pdf`;
  }

  if (!storagePath) {
    return NextResponse.json(
      { ok: false, error: "Documento sem arquivo." },
      { status: 404 }
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
  const name = fileName || storagePath.split("/").pop() || "documento";

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFromName(name),
      "Content-Disposition": `inline; filename="${name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
