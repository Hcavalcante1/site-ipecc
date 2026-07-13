import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  carregarDocumentoNoEscopo,
  registrarLog,
} from "@/lib/documentos";

type Ctx = { params: { id: string } };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth, {
    allowDeleted: true,
  });
  if ("error" in loaded && loaded.error) return loaded.error;

  if (!loaded.data!.deleted_at) {
    return NextResponse.json(
      { ok: false, error: "Documento não está na lixeira." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("gd_documents")
    .update({ deleted_at: null, updated_at: now })
    .eq("id", ctx.params.id)
    .select(
      "id, processo_id, folder_id, category_id, title, number, description, status, current_version, favorite, storage_path, mime_type, file_name, file_size, file_hash, created_by, created_at, updated_at, deleted_at"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: data.processo_id,
    document_id: data.id,
    action: "document.restore",
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
  });

  return NextResponse.json({ ok: true, document: data });
}
