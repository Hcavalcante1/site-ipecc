import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  GD_DEFAULT_WORKFLOW_STEPS,
  listarPassosWorkflow,
  listarWorkflows,
  obterWorkflow,
  registrarLog,
  requestAuditMeta,
  tabelaAusente,
  validarTituloDocumento,
  WF_SELECT,
  STEP_SELECT,
} from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";

export async function GET(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const id = req.nextUrl.searchParams.get("id");
  const processoIds = processoIdsDoEscopo(auth.contexto);

  if (id) {
    const { data, error } = await obterWorkflow(id);
    if (error) {
      if (tabelaAusente(error.message, error.code)) {
        return NextResponse.json({
          ok: true,
          workflow: null,
          steps: [],
          aviso:
            "Tabelas da Gestão Documental ausentes. Aplique docs/sql/gestao-documental-fase-1.sql no Supabase.",
        });
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    if (!data || data.deleted_at) {
      return NextResponse.json(
        { ok: false, error: "Fluxo não encontrado." },
        { status: 404 }
      );
    }
    if (!registroNoEscopoProcesso(data.processo_id, processoIds)) {
      return NextResponse.json(
        { ok: false, error: "Fluxo fora do seu escopo." },
        { status: 403 }
      );
    }
    const steps = await listarPassosWorkflow(id);
    return NextResponse.json({
      ok: true,
      workflow: data,
      steps: steps.data || [],
    });
  }

  const { data, error } = await listarWorkflows();
  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return NextResponse.json({
        ok: true,
        workflows: [],
        aviso:
          "Tabelas da Gestão Documental ausentes. Aplique docs/sql/gestao-documental-fase-1.sql no Supabase.",
      });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const workflows = (data || []).filter((w) =>
    registroNoEscopoProcesso(w.processo_id, processoIds)
  );

  return NextResponse.json({ ok: true, workflows });
}

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);

  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      processo_id?: string | null;
      is_default?: boolean;
      seed_padrao?: boolean;
    };

    const name = validarTituloDocumento(body.name);
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Nome do fluxo é obrigatório." },
        { status: 400 }
      );
    }

    const processoIds = processoIdsDoEscopo(auth.contexto);
    let processoId = body.processo_id || null;
    if (processoIds !== "todos") {
      if (!processoId && processoIds.length === 1) processoId = processoIds[0];
      if (!registroNoEscopoProcesso(processoId, processoIds)) {
        return NextResponse.json(
          { ok: false, error: "Processo fora do seu escopo." },
          { status: 403 }
        );
      }
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("gd_document_workflows")
      .insert({
        name,
        description: body.description?.trim() || null,
        processo_id: processoId,
        is_default: Boolean(body.is_default),
        ativo: true,
        created_by: auth.userId,
      })
      .select(WF_SELECT)
      .single();

    if (error) {
      if (tabelaAusente(error.message, error.code)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Tabelas da Gestão Documental ausentes. Aplique docs/sql/gestao-documental-fase-1.sql no Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    let steps: unknown[] = [];
    if (body.seed_padrao !== false) {
      const seed = GD_DEFAULT_WORKFLOW_STEPS.map((s) => ({
        workflow_id: data.id,
        step_order: s.step_order,
        name: s.name,
        from_status: s.from_status,
        to_status: s.to_status,
        role_required: s.role_required,
        parallel: false,
        created_by: auth.userId,
      }));
      const seeded = await admin
        .from("gd_workflow_steps")
        .insert(seed)
        .select(STEP_SELECT);
      steps = seeded.data || [];
    }

    await registrarLog({
      processo_id: processoId,
      action: "workflow.create",
      detail: { id: data.id, name },
      actor_id: auth.userId,
      actor_email: auth.contexto.email,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });

    return NextResponse.json({ ok: true, workflow: data, steps });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar fluxo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);
  const body = (await req.json()) as {
    id?: string;
    name?: string;
    description?: string | null;
    is_default?: boolean;
    ativo?: boolean;
  };

  if (!body.id) {
    return NextResponse.json(
      { ok: false, error: "Identificador do fluxo é obrigatório." },
      { status: 400 }
    );
  }

  const { data: existing } = await obterWorkflow(body.id);
  if (!existing || existing.deleted_at) {
    return NextResponse.json(
      { ok: false, error: "Fluxo não encontrado." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(existing.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Fluxo fora do seu escopo." },
      { status: 403 }
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) {
    const name = validarTituloDocumento(body.name);
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Nome do fluxo é obrigatório." },
        { status: 400 }
      );
    }
    patch.name = name;
  }
  if (body.description !== undefined) {
    patch.description = body.description?.trim() || null;
  }
  if (body.is_default !== undefined) patch.is_default = Boolean(body.is_default);
  if (body.ativo !== undefined) patch.ativo = Boolean(body.ativo);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_document_workflows")
    .update(patch)
    .eq("id", body.id)
    .select(WF_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: data.processo_id,
    action: "workflow.update",
    detail: { id: data.id },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true, workflow: data });
}

export async function DELETE(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Identificador do fluxo é obrigatório." },
      { status: 400 }
    );
  }

  const { data: existing } = await obterWorkflow(id);
  if (!existing || existing.deleted_at) {
    return NextResponse.json(
      { ok: false, error: "Fluxo não encontrado." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(existing.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Fluxo fora do seu escopo." },
      { status: 403 }
    );
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("gd_document_workflows")
    .update({ deleted_at: now, updated_at: now, ativo: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: existing.processo_id,
    action: "workflow.soft_delete",
    detail: { id },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true });
}
