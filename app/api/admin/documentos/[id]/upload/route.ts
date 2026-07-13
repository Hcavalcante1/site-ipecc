import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  obterDocumento,
  registrarLog,
  sha256Buffer,
  validarArquivoGestaoDocumental,
  GD_STORAGE_BUCKET,
} from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const { data: doc, error: docErr } = await obterDocumento(ctx.params.id);
  if (docErr) {
    return NextResponse.json(
      { ok: false, error: docErr.message },
      { status: 500 }
    );
  }
  if (!doc || doc.deleted_at) {
    return NextResponse.json(
      { ok: false, error: "Documento não encontrado." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(doc.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Documento fora do seu escopo." },
      { status: 403 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const changeNote = String(form.get("change_note") || "").trim() || null;

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "Arquivo é obrigatório." },
        { status: 400 }
      );
    }

    const fileName =
      (file instanceof File && file.name) ||
      String(form.get("file_name") || "arquivo.bin");

    const check = validarArquivoGestaoDocumental({
      fileName,
      mimeType: file.type,
      size: file.size,
    });
    if (check.ok === false) {
      return NextResponse.json(
        { ok: false, error: check.error },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = sha256Buffer(buffer);
    const nextVersion = (doc.current_version || 0) + 1;
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const storagePath = `${doc.processo_id || "geral"}/${doc.id}/v${nextVersion}-${safeName}`;

    const admin = getSupabaseAdmin();
    const { error: upErr } = await admin.storage
      .from(GD_STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        upsert: false,
        contentType: file.type || undefined,
      });

    if (upErr) {
      const bucketMissing = /bucket|not found|does not exist/i.test(
        upErr.message || ""
      );
      return NextResponse.json(
        {
          ok: false,
          error: bucketMissing
            ? "Bucket gestao-documental ausente. Aplique docs/sql/gestao-documental-storage-bucket.sql no Supabase."
            : upErr.message,
        },
        { status: 500 }
      );
    }

    const { data: version, error: verErr } = await admin
      .from("gd_document_versions")
      .insert({
        document_id: doc.id,
        version_number: nextVersion,
        storage_path: storagePath,
        mime_type: file.type || null,
        file_name: fileName,
        file_size: file.size,
        file_hash: hash,
        change_note: changeNote,
        created_by: auth.userId,
      })
      .select(
        "id, document_id, version_number, storage_path, mime_type, file_name, file_size, file_hash, change_note, created_by, created_at"
      )
      .single();

    if (verErr) {
      return NextResponse.json(
        { ok: false, error: verErr.message },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();
    const { data: updated, error: updErr } = await admin
      .from("gd_documents")
      .update({
        current_version: nextVersion,
        storage_path: storagePath,
        mime_type: file.type || null,
        file_name: fileName,
        file_size: file.size,
        file_hash: hash,
        updated_at: now,
      })
      .eq("id", doc.id)
      .select(
        "id, processo_id, folder_id, category_id, title, number, description, status, current_version, favorite, storage_path, mime_type, file_name, file_size, file_hash, created_by, created_at, updated_at, deleted_at"
      )
      .single();

    if (updErr) {
      return NextResponse.json(
        { ok: false, error: updErr.message },
        { status: 500 }
      );
    }

    await registrarLog({
      processo_id: doc.processo_id,
      document_id: doc.id,
      action: "document.upload_version",
      detail: {
        version: nextVersion,
        file_name: fileName,
        file_hash: hash,
      },
      actor_id: auth.userId,
      actor_email: auth.contexto.email,
    });

    return NextResponse.json({
      ok: true,
      document: updated,
      version,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro no envio do arquivo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
