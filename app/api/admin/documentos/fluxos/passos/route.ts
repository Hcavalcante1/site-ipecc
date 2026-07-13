import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  isGdDocumentStatus,
  listarPassosWorkflow,
  obterWorkflow,
  registrarLog,
  requestAuditMeta,
  STEP_SELECT,
} from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);
  const body = (await req.json()) as {
    workflow_id?: string;
    name?: string;
    from_status?: string | null;
    to_status?: string | null;
    role_required?: string | null;
    parallel?: boolean;
    step_order?: number;
  };

  if (!body.workflow_id || !String(body.name || "").trim()) {
    return NextResponse.json(
      { ok: false, error: "Fluxo e nome do passo são obrigatórios." },
      { status: 400 }
    );
  }

  if (body.from_status && !isGdDocumentStatus(body.from_status)) {
    return NextResponse.json(
      { ok: false, error: "Status de origem inválido." },
      { status: 400 }
    );
  }
  if (body.to_status && !isGdDocumentStatus(body.to_status)) {
    return NextResponse.json(
      { ok: false, error: "Status de destino inválido." },
      { status: 400 }
    );
  }

  const { data: wf } = await obterWorkflow(body.workflow_id);
  if (!wf || wf.deleted_at) {
    return NextResponse.json(
      { ok: false, error: "Fluxo não encontrado." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(wf.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Fluxo fora do seu escopo." },
      { status: 403 }
    );
  }

  const existing = await listarPassosWorkflow(body.workflow_id);
  const nextOrder =
    body.step_order ??
    Math.max(0, ...(existing.data || []).map((s) => s.step_order), 0) + 1;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_workflow_steps")
    .insert({
      workflow_id: body.workflow_id,
      step_order: nextOrder,
      name: String(body.name).trim(),
      from_status: body.from_status || null,
      to_status: body.to_status || null,
      role_required: body.role_required?.trim() || null,
      parallel: Boolean(body.parallel),
      created_by: auth.userId,
    })
    .select(STEP_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: wf.processo_id,
    action: "workflow.step_create",
    detail: { step_id: data.id, workflow_id: body.workflow_id },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true, step: data });
}

export async function DELETE(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Identificador do passo é obrigatório." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data: step } = await admin
    .from("gd_workflow_steps")
    .select("id, workflow_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!step) {
    return NextResponse.json(
      { ok: false, error: "Passo não encontrado." },
      { status: 404 }
    );
  }

  const { data: wf } = await obterWorkflow(step.workflow_id);
  if (!wf) {
    return NextResponse.json(
      { ok: false, error: "Fluxo não encontrado." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(wf.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Fluxo fora do seu escopo." },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("gd_workflow_steps")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: wf.processo_id,
    action: "workflow.step_delete",
    detail: { step_id: id },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true });
}
