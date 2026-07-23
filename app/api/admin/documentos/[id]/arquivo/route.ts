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
 * Retorna o arquivo do storage: gera signed URL e faz o download server-side.
 * GET /api/admin/documentos/{id}/arquivo?versao=atual|assinado
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

  // Fallback: busca versão mais recente em gd_document_versions
  if (!storagePath) {
    const currentVersion = Number(doc.current_version) || 1;
    const { data: versionExact } = await admin
      .from("gd_document_versions")
      .select("storage_path, version_number")
      .eq("document_id", id)
      .eq("version_number", currentVersion)
      .maybeSingle();
    let version = versionExact;
    if (!version?.storage_path) {
      const { data: versionLatest } = await admin
        .from("gd_document_versions")
        .select("storage_path, version_number")
        .eq("document_id", id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      version = versionLatest;
    }
    storagePath = version?.storage_path || null;
  }

  if (!storagePath) {
    return NextResponse.json(
      { ok: false, error: "Documento sem arquivo no storage." },
      { status: 404 }
    );
  }

  const cleanPath = storagePath.replace(/^\//, "");

  try {
    // Gera signed URL (60s) e faz o download server-side com fetch simples —
    // evita o problema de CORS ao redirecionar para domínio cross-origin.
    const { data: signed, error: signErr } = await admin.storage
      .from(GD_STORAGE_BUCKET)
      .createSignedUrl(cleanPath, 60);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: signErr?.message || "Não foi possível gerar URL de acesso ao arquivo.",
        },
        { status: 500 }
      );
    }

    const fileRes = await fetch(signed.signedUrl);
    if (!fileRes.ok) {
      return NextResponse.json(
        { ok: false, error: `Storage retornou ${fileRes.status}.` },
        { status: 404 }
      );
    }

    const buf = Buffer.from(await fileRes.arrayBuffer());
    const name = fileName || cleanPath.split("/").pop() || "documento";

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFromName(name),
        "Content-Disposition": `inline; filename="${name.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao acessar storage.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
