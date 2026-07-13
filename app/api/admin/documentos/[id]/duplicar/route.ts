import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  carregarDocumentoNoEscopo,
  registrarLog,
  DOC_SELECT,
} from "@/lib/documentos";

type Ctx = { params: { id: string } };

/** Duplica metadados do documento (sem copiar arquivo físico na Fase 2). */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const src = loaded.data!;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_documents")
    .insert({
      title: `${src.title} (cópia)`,
      description: src.description,
      number: src.number,
      processo_id: src.processo_id,
      folder_id: src.folder_id,
      category_id: src.category_id,
      status: "draft",
      current_version: 0,
      favorite: false,
      storage_path: null,
      mime_type: null,
      file_name: null,
      file_size: null,
      file_hash: null,
      created_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .select(DOC_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const { data: tags } = await admin
    .from("gd_document_tags")
    .select("tag")
    .eq("document_id", src.id)
    .is("deleted_at", null);

  if (tags && tags.length > 0) {
    await admin.from("gd_document_tags").insert(
      tags.map((t) => ({
        document_id: data.id,
        tag: t.tag,
        created_by: auth.userId,
      }))
    );
  }

  await registrarLog({
    processo_id: data.processo_id,
    document_id: data.id,
    action: "document.duplicate",
    detail: { from: src.id },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
  });

  return NextResponse.json({ ok: true, document: data });
}
