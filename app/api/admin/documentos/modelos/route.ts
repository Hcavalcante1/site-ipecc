import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  isGdTemplateFormat,
  isGdTemplateKind,
  registrarLog,
  tabelaAusente,
  validarTituloDocumento,
} from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";

const SELECT =
  "id, processo_id, name, kind, format, body, storage_path, ativo, created_by, created_at, updated_at, deleted_at";

export async function GET() {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_document_templates")
    .select(SELECT)
    .is("deleted_at", null)
    .order("name");

  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return NextResponse.json({
        ok: true,
        templates: [],
        aviso:
          "Tabelas da Gestão Documental ausentes. Aplique docs/sql/gestao-documental-fase-1.sql no Supabase.",
      });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  const templates = (data || []).filter((t) =>
    registroNoEscopoProcesso(t.processo_id, processoIds)
  );

  return NextResponse.json({ ok: true, templates });
}

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      name?: string;
      kind?: string;
      format?: string;
      body?: string;
      processo_id?: string | null;
      ativo?: boolean;
    };

    const name = validarTituloDocumento(body.name);
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Nome do modelo é obrigatório." },
        { status: 400 }
      );
    }

    const kind =
      body.kind && isGdTemplateKind(body.kind) ? body.kind : "contrato";
    const format =
      body.format && isGdTemplateFormat(body.format) ? body.format : "pdf";

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
      .from("gd_document_templates")
      .insert({
        name,
        kind,
        format,
        body: body.body?.trim() || null,
        processo_id: processoId,
        ativo: body.ativo !== false,
        created_by: auth.userId,
      })
      .select(SELECT)
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

    await registrarLog({
      processo_id: processoId,
      action: "template.create",
      detail: { id: data.id, name, kind, format },
      actor_id: auth.userId,
      actor_email: auth.contexto.email,
    });

    return NextResponse.json({ ok: true, template: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar modelo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    kind?: string;
    format?: string;
    body?: string | null;
    ativo?: boolean;
  };

  if (!body.id) {
    return NextResponse.json(
      { ok: false, error: "Identificador do modelo é obrigatório." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("gd_document_templates")
    .select("id, processo_id")
    .eq("id", body.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Modelo não encontrado." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(existing.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Modelo fora do seu escopo." },
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
        { ok: false, error: "Nome do modelo é obrigatório." },
        { status: 400 }
      );
    }
    patch.name = name;
  }
  if (body.kind !== undefined) {
    if (!isGdTemplateKind(body.kind)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de modelo inválido." },
        { status: 400 }
      );
    }
    patch.kind = body.kind;
  }
  if (body.format !== undefined) {
    if (!isGdTemplateFormat(body.format)) {
      return NextResponse.json(
        { ok: false, error: "Formato inválido." },
        { status: 400 }
      );
    }
    patch.format = body.format;
  }
  if (body.body !== undefined) patch.body = body.body?.trim() || null;
  if (body.ativo !== undefined) patch.ativo = Boolean(body.ativo);

  const { data, error } = await admin
    .from("gd_document_templates")
    .update(patch)
    .eq("id", body.id)
    .select(SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: data.processo_id,
    action: "template.update",
    detail: { id: data.id },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
  });

  return NextResponse.json({ ok: true, template: data });
}

export async function DELETE(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Identificador do modelo é obrigatório." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("gd_document_templates")
    .select("id, processo_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Modelo não encontrado." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(existing.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Modelo fora do seu escopo." },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("gd_document_templates")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: existing.processo_id,
    action: "template.soft_delete",
    detail: { id },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
  });

  return NextResponse.json({ ok: true });
}
