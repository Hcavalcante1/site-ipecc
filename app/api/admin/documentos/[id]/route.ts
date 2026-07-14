import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  isGdDocumentStatus,
  listarHistoricoWorkflow,
  listarLogsDocumento,
  listarPassosWorkflow,
  listarPermissoesDocumento,
  listarTagsDocumento,
  listarWorkflows,
  previewKindFromMime,
  registrarLog,
  requestAuditMeta,
  validarTituloDocumento,
  carregarDocumentoNoEscopo,
  GD_STORAGE_BUCKET,
} from "@/lib/documentos";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const doc = loaded.data!;
  const admin = getSupabaseAdmin();
  const { data: versions } = await admin
    .from("gd_document_versions")
    .select(
      "id, document_id, version_number, storage_path, mime_type, file_name, file_size, file_hash, change_note, created_by, created_at"
    )
    .eq("document_id", ctx.params.id)
    .is("deleted_at", null)
    .order("version_number", { ascending: false });

  const tagsRes = await listarTagsDocumento(ctx.params.id);
  const logsRes = await listarLogsDocumento(ctx.params.id, 40);
  const permsRes = await listarPermissoesDocumento(ctx.params.id);
  const wfHistRes = await listarHistoricoWorkflow(ctx.params.id, 40);

  let workflowId =
    (doc as { workflow_id?: string | null }).workflow_id || null;
  if (!workflowId) {
    const { data: wfs } = await listarWorkflows();
    const def =
      (wfs || []).find((w) => w.is_default && w.ativo) ||
      (wfs || []).find((w) => w.ativo);
    workflowId = def?.id || null;
  }

  let steps: Awaited<ReturnType<typeof listarPassosWorkflow>>["data"] = [];
  if (workflowId) {
    const stepsRes = await listarPassosWorkflow(workflowId);
    steps = stepsRes.data || [];
  }

  const availableSteps = (steps || []).filter(
    (s) =>
      (!s.from_status || s.from_status === doc.status) &&
      s.to_status &&
      isGdDocumentStatus(s.to_status)
  );

  let downloadUrl: string | null = null;
  let previewText: string | null = null;
  const previewKind = previewKindFromMime(doc.mime_type, doc.file_name);

  if (doc.storage_path) {
    // Proxy no domínio IPECC — evita URL longa do Supabase Storage
    downloadUrl = `/api/admin/documentos/${doc.id}/arquivo`;

    if (previewKind === "text") {
      try {
        const { data: file } = await admin.storage
          .from(GD_STORAGE_BUCKET)
          .download(doc.storage_path);
        if (file) {
          previewText = (await file.text()).slice(0, 200_000);
        }
      } catch {
        previewText = null;
      }
    }
  }

  const { data: allWorkflows } = await listarWorkflows();

  return NextResponse.json({
    ok: true,
    document: doc,
    versions: versions || [],
    tags: tagsRes.data || [],
    logs: logsRes.data || [],
    permissions: permsRes.data || [],
    workflowHistory: wfHistRes.data || [],
    workflowId,
    availableSteps,
    workflows: (allWorkflows || []).filter((w) => w.ativo),
    downloadUrl,
    previewKind,
    previewText,
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);
  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  try {
    const body = (await req.json()) as {
      title?: string;
      description?: string | null;
      number?: string | null;
      folder_id?: string | null;
      category_id?: string | null;
      status?: string;
      favorite?: boolean;
      workflow_id?: string | null;
    };

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) {
      const title = validarTituloDocumento(body.title);
      if (!title) {
        return NextResponse.json(
          { ok: false, error: "Título é obrigatório." },
          { status: 400 }
        );
      }
      patch.title = title;
    }
    if (body.description !== undefined) {
      patch.description = body.description?.trim() || null;
    }
    if (body.number !== undefined) {
      patch.number = body.number?.trim() || null;
    }
    if (body.folder_id !== undefined) patch.folder_id = body.folder_id;
    if (body.category_id !== undefined) patch.category_id = body.category_id;
    if (body.favorite !== undefined) patch.favorite = Boolean(body.favorite);
    if (body.workflow_id !== undefined) patch.workflow_id = body.workflow_id;
    if (body.status !== undefined) {
      if (!isGdDocumentStatus(body.status)) {
        return NextResponse.json(
          { ok: false, error: "Status inválido." },
          { status: 400 }
        );
      }
      patch.status = body.status;
    }

    const admin = getSupabaseAdmin();
    let { data, error } = await admin
      .from("gd_documents")
      .update(patch)
      .eq("id", ctx.params.id)
      .select(
        "id, processo_id, folder_id, category_id, title, number, description, status, current_version, favorite, storage_path, mime_type, file_name, file_size, file_hash, workflow_id, created_by, created_at, updated_at, deleted_at"
      )
      .single();

    if (error && /workflow_id|column .* does not exist/i.test(error.message)) {
      delete patch.workflow_id;
      const fallback = await admin
        .from("gd_documents")
        .update(patch)
        .eq("id", ctx.params.id)
        .select(
          "id, processo_id, folder_id, category_id, title, number, description, status, current_version, favorite, storage_path, mime_type, file_name, file_size, file_hash, created_by, created_at, updated_at, deleted_at"
        )
        .single();
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const action =
      body.favorite !== undefined && Object.keys(patch).length <= 2
        ? body.favorite
          ? "document.favorite"
          : "document.unfavorite"
        : body.status === "archived"
          ? "document.archive"
          : "document.update";

    await registrarLog({
      processo_id: data!.processo_id,
      document_id: data!.id,
      action,
      detail: patch,
      actor_id: auth.userId,
      actor_email: auth.contexto.email,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });

    return NextResponse.json({ ok: true, document: data });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar documento.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);
  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("gd_documents")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", ctx.params.id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: loaded.data!.processo_id,
    document_id: ctx.params.id,
    action: "document.soft_delete",
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true });
}
