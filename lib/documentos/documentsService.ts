import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { GdDashboardCounts, GdDocument, GdDocumentStatus } from "./types";

export const DOC_SELECT =
  "id, processo_id, folder_id, category_id, title, number, description, status, current_version, favorite, storage_path, mime_type, file_name, file_size, file_hash, workflow_id, created_by, created_at, updated_at, deleted_at";

export const DOC_SELECT_SEM_WF =
  "id, processo_id, folder_id, category_id, title, number, description, status, current_version, favorite, storage_path, mime_type, file_name, file_size, file_hash, created_by, created_at, updated_at, deleted_at";

function colunaWorkflowAusente(message?: string) {
  return /workflow_id|column .* does not exist/i.test(message || "");
}

type ListResult = {
  data: GdDocument[] | null;
  error: { message?: string; code?: string } | null;
};

export async function listarDocumentos(opts?: {
  processoId?: string | null;
  processoIds?: string[];
  status?: GdDocumentStatus;
  q?: string;
  favorite?: boolean;
  folderId?: string | null;
  categoryId?: string | null;
  onlyDeleted?: boolean;
  includeDeleted?: boolean;
  limit?: number;
}): Promise<ListResult> {
  const admin = getSupabaseAdmin();

  async function build(select: string): Promise<ListResult> {
    let query = admin
      .from("gd_documents")
      .select(select)
      .order("updated_at", { ascending: false })
      .limit(opts?.limit ?? 100);

    if (opts?.onlyDeleted) {
      query = query.not("deleted_at", "is", null);
    } else if (!opts?.includeDeleted) {
      query = query.is("deleted_at", null);
    }

    if (opts?.processoIds && opts.processoIds.length > 0) {
      query = query.in("processo_id", opts.processoIds);
    } else if (opts?.processoId) {
      query = query.eq("processo_id", opts.processoId);
    }
    if (opts?.status) {
      query = query.eq("status", opts.status);
    }
    if (opts?.favorite === true) {
      query = query.eq("favorite", true);
    }
    if (opts?.folderId) {
      query = query.eq("folder_id", opts.folderId);
    }
    if (opts?.categoryId) {
      query = query.eq("category_id", opts.categoryId);
    }
    if (opts?.q) {
      const term = opts.q.replace(/%/g, "");
      query = query.or(
        `title.ilike.%${term}%,number.ilike.%${term}%,description.ilike.%${term}%`
      );
    }
    const res = await query;
    return {
      data: (res.data as unknown as GdDocument[] | null) || null,
      error: res.error
        ? { message: res.error.message, code: res.error.code }
        : null,
    };
  }

  const first = await build(DOC_SELECT);
  if (first.error && colunaWorkflowAusente(first.error.message)) {
    return build(DOC_SELECT_SEM_WF);
  }
  return first;
}

export async function obterDocumento(id: string): Promise<{
  data: GdDocument | null;
  error: { message?: string; code?: string } | null;
}> {
  const admin = getSupabaseAdmin();
  const first = await admin
    .from("gd_documents")
    .select(DOC_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (first.error && colunaWorkflowAusente(first.error.message)) {
    const fallback = await admin
      .from("gd_documents")
      .select(DOC_SELECT_SEM_WF)
      .eq("id", id)
      .maybeSingle();
    return {
      data: (fallback.data as unknown as GdDocument | null) || null,
      error: fallback.error
        ? { message: fallback.error.message, code: fallback.error.code }
        : null,
    };
  }

  return {
    data: (first.data as unknown as GdDocument | null) || null,
    error: first.error
      ? { message: first.error.message, code: first.error.code }
      : null,
  };
}

export async function listarTagsDocumento(documentId: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("gd_document_tags")
    .select("id, document_id, tag, created_at")
    .eq("document_id", documentId)
    .is("deleted_at", null)
    .order("tag");
}

export async function listarLogsDocumento(documentId: string, limit = 50) {
  const admin = getSupabaseAdmin();
  return admin
    .from("gd_document_logs")
    .select(
      "id, processo_id, document_id, action, detail, actor_id, actor_email, created_at"
    )
    .eq("document_id", documentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function registrarLog(opts: {
  processo_id?: string | null;
  document_id?: string | null;
  batch_id?: string | null;
  action: string;
  detail?: Record<string, unknown>;
  actor_id?: string | null;
  actor_email?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}) {
  const admin = getSupabaseAdmin();
  await admin.from("gd_document_logs").insert({
    processo_id: opts.processo_id ?? null,
    document_id: opts.document_id ?? null,
    batch_id: opts.batch_id ?? null,
    action: opts.action,
    detail: opts.detail ?? null,
    actor_id: opts.actor_id ?? null,
    actor_email: opts.actor_email ?? null,
    ip: opts.ip ?? null,
    user_agent: opts.user_agent ?? null,
    created_by: opts.actor_id ?? null,
  });
}

export async function contarDashboard(
  processoIds: string[] | "todos"
): Promise<{ counts: GdDashboardCounts; aviso?: string }> {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("gd_documents")
    .select("status")
    .is("deleted_at", null)
    .limit(2000);

  if (processoIds !== "todos" && processoIds.length > 0) {
    query = query.in("processo_id", processoIds);
  }

  const { data, error } = await query;

  const empty: GdDashboardCounts = {
    ativos: 0,
    em_revisao: 0,
    pendentes: 0,
    prontos_assinatura: 0,
    assinados: 0,
    rejeitados: 0,
    arquivados: 0,
    lotes_ativos: 0,
  };

  if (error) {
    const missing =
      error.code === "42P01" ||
      /relation .* does not exist|could not find the table/i.test(
        error.message || ""
      );
    return {
      counts: empty,
      aviso: missing
        ? "Tabelas da Gestão Documental ausentes. Aplique docs/sql/gestao-documental-fase-1.sql no Supabase."
        : error.message,
    };
  }

  const counts = { ...empty };
  for (const row of data || []) {
    const s = row.status as string;
    if (s !== "archived" && s !== "signed") counts.ativos += 1;
    if (s === "in_review") counts.em_revisao += 1;
    if (s === "awaiting_approval" || s === "draft") counts.pendentes += 1;
    if (s === "ready_to_sign") counts.prontos_assinatura += 1;
    if (s === "signed") counts.assinados += 1;
    if (s === "rejected") counts.rejeitados += 1;
    if (s === "archived") counts.arquivados += 1;
  }

  let lotesQuery = admin
    .from("gd_signature_batches")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .in("status", ["ready", "running", "paused"]);

  if (processoIds !== "todos" && processoIds.length > 0) {
    lotesQuery = lotesQuery.in("processo_id", processoIds);
  }

  const lotes = await lotesQuery;
  if (!lotes.error) {
    counts.lotes_ativos = lotes.count || 0;
  }

  return { counts };
}
