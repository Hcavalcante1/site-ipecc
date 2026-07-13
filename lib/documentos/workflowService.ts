import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AdminContexto } from "@/lib/auth/adminEscopo";
import { isMestre } from "@/lib/auth/adminEscopo";

const WF_SELECT =
  "id, processo_id, name, description, is_default, ativo, created_by, created_at, updated_at, deleted_at";

const STEP_SELECT =
  "id, workflow_id, step_order, name, from_status, to_status, role_required, parallel, created_by, created_at, updated_at, deleted_at";

function permissaoCobre(have: string, need: string): boolean {
  if (have === "admin") return true;
  if (have === "gestor" && need !== "admin") return true;
  return have === need;
}

export async function listarWorkflows() {
  const admin = getSupabaseAdmin();
  return admin
    .from("gd_document_workflows")
    .select(WF_SELECT)
    .is("deleted_at", null)
    .order("name");
}

export async function obterWorkflow(id: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("gd_document_workflows")
    .select(WF_SELECT)
    .eq("id", id)
    .maybeSingle();
}

export async function listarPassosWorkflow(workflowId: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("gd_workflow_steps")
    .select(STEP_SELECT)
    .eq("workflow_id", workflowId)
    .is("deleted_at", null)
    .order("step_order");
}

export async function listarHistoricoWorkflow(documentId: string, limit = 50) {
  const admin = getSupabaseAdmin();
  return admin
    .from("gd_workflow_history")
    .select(
      "id, document_id, workflow_id, step_id, from_status, to_status, comment, actor_id, created_at"
    )
    .eq("document_id", documentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function listarPermissoesDocumento(documentId: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("gd_document_permissions")
    .select(
      "id, document_id, processo_id, subject_type, subject_id, permission, created_by, created_at, updated_at, deleted_at"
    )
    .eq("document_id", documentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Verifica se o usuário pode executar um papel no documento.
 * Mestre sempre pode. Sem ACL cadastrada, quem tem o módulo pode (compatível com Fases 1–2).
 */
export async function usuarioPodePapelDocumento(
  ctx: AdminContexto,
  documentId: string,
  roleRequired: string | null | undefined
): Promise<boolean> {
  if (isMestre(ctx)) return true;
  if (!roleRequired) return true;

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("gd_document_permissions")
    .select("permission, subject_type, subject_id")
    .eq("document_id", documentId)
    .is("deleted_at", null);

  if (!data || data.length === 0) return true;

  const email = (ctx.email || "").toLowerCase();
  const userId = ctx.userId;
  const need = roleRequired;

  const userRows = data.filter(
    (r) =>
      r.subject_type === "user" &&
      (r.subject_id === userId || r.subject_id.toLowerCase() === email)
  );
  const orgRows = data.filter(
    (r) => r.subject_type === "role" || r.subject_type === "group"
  );

  const hasAnyUserAcl = data.some((r) => r.subject_type === "user");
  if (hasAnyUserAcl && userRows.length === 0 && orgRows.length === 0) {
    return false;
  }

  const effective = hasAnyUserAcl
    ? [...userRows, ...orgRows]
    : [...userRows, ...orgRows];

  if (effective.length === 0) return false;

  return effective.some((r) => permissaoCobre(r.permission, need));
}

export { WF_SELECT, STEP_SELECT };
