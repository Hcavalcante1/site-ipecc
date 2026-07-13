import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  carregarDocumentoNoEscopo,
  isGdDocumentStatus,
  listarPassosWorkflow,
  listarWorkflows,
  obterWorkflow,
  registrarLog,
  requestAuditMeta,
  usuarioPodePapelDocumento,
  DOC_SELECT,
  DOC_SELECT_SEM_WF,
} from "@/lib/documentos";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);
  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const doc = loaded.data!;
  const body = (await req.json()) as {
    step_id?: string;
    workflow_id?: string | null;
    comment?: string;
  };

  const admin = getSupabaseAdmin();
  let workflowId =
    body.workflow_id ||
    (doc as { workflow_id?: string | null }).workflow_id ||
    null;

  if (!workflowId) {
    const { data: wfs } = await listarWorkflows();
    const def =
      (wfs || []).find((w) => w.is_default && w.ativo) ||
      (wfs || []).find((w) => w.ativo);
    workflowId = def?.id || null;
  }

  if (!workflowId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Nenhum fluxo disponível. Crie um fluxo em /admin/documentos/fluxos.",
      },
      { status: 400 }
    );
  }

  const { data: wf } = await obterWorkflow(workflowId);
  if (!wf || !wf.ativo || wf.deleted_at) {
    return NextResponse.json(
      { ok: false, error: "Fluxo inválido ou inativo." },
      { status: 400 }
    );
  }

  const { data: steps } = await listarPassosWorkflow(workflowId);
  let step = body.step_id
    ? (steps || []).find((s) => s.id === body.step_id)
    : undefined;

  if (!step) {
    step = (steps || []).find(
      (s) =>
        (!s.from_status || s.from_status === doc.status) &&
        s.to_status &&
        isGdDocumentStatus(s.to_status)
    );
  }

  if (!step || !step.to_status || !isGdDocumentStatus(step.to_status)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Nenhuma transição válida a partir do status atual. Selecione um passo.",
      },
      { status: 400 }
    );
  }

  if (step.from_status && step.from_status !== doc.status) {
    return NextResponse.json(
      {
        ok: false,
        error: `Este passo exige status "${step.from_status}", mas o documento está em "${doc.status}".`,
      },
      { status: 400 }
    );
  }

  const pode = await usuarioPodePapelDocumento(
    auth.contexto,
    doc.id,
    step.role_required
  );
  if (!pode) {
    return NextResponse.json(
      {
        ok: false,
        error: `Sem permissão para o papel "${step.role_required}" neste documento.`,
      },
      { status: 403 }
    );
  }

  const fromStatus = doc.status;
  const toStatus = step.to_status;
  const now = new Date().toISOString();

  let updated;
  let updErr;
  {
    const res = await admin
      .from("gd_documents")
      .update({
        status: toStatus,
        workflow_id: workflowId,
        updated_at: now,
      })
      .eq("id", doc.id)
      .select(DOC_SELECT)
      .single();
    updated = res.data;
    updErr = res.error;
    if (updErr && /workflow_id|column .* does not exist/i.test(updErr.message)) {
      const fallback = await admin
        .from("gd_documents")
        .update({ status: toStatus, updated_at: now })
        .eq("id", doc.id)
        .select(DOC_SELECT_SEM_WF)
        .single();
      updated = fallback.data;
      updErr = fallback.error;
    }
  }

  if (updErr || !updated) {
    return NextResponse.json(
      {
        ok: false,
        error:
          updErr?.message ||
          "Falha ao atualizar status. Aplique docs/sql/gestao-documental-fase-3.sql se a coluna workflow_id faltar.",
      },
      { status: 500 }
    );
  }

  await admin.from("gd_workflow_history").insert({
    document_id: doc.id,
    workflow_id: workflowId,
    step_id: step.id,
    from_status: fromStatus,
    to_status: toStatus,
    comment: body.comment?.trim() || null,
    actor_id: auth.userId,
    created_by: auth.userId,
  });

  await registrarLog({
    processo_id: doc.processo_id,
    document_id: doc.id,
    action: "workflow.transition",
    detail: {
      step_id: step.id,
      step_name: step.name,
      from_status: fromStatus,
      to_status: toStatus,
      workflow_id: workflowId,
    },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({
    ok: true,
    document: updated,
    transition: {
      from_status: fromStatus,
      to_status: toStatus,
      step,
    },
  });
}
