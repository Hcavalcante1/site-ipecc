import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  carregarDocumentoNoEscopo,
  isGdPermission,
  isGdSubjectType,
  listarPermissoesDocumento,
  registrarLog,
  requestAuditMeta,
} from "@/lib/documentos";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const { data, error } = await listarPermissoesDocumento(ctx.params.id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, permissions: data || [] });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);
  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const body = (await req.json()) as {
    subject_type?: string;
    subject_id?: string;
    permission?: string;
  };

  if (!body.subject_type || !isGdSubjectType(body.subject_type)) {
    return NextResponse.json(
      { ok: false, error: "Tipo de sujeito inválido (user, group ou role)." },
      { status: 400 }
    );
  }
  if (!body.permission || !isGdPermission(body.permission)) {
    return NextResponse.json(
      { ok: false, error: "Permissão inválida." },
      { status: 400 }
    );
  }
  const subjectId = String(body.subject_id || "").trim();
  if (!subjectId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Informe o identificador (e-mail/UUID do usuário, nome do grupo ou cargo).",
      },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_document_permissions")
    .insert({
      document_id: ctx.params.id,
      processo_id: loaded.data!.processo_id,
      subject_type: body.subject_type,
      subject_id: subjectId,
      permission: body.permission,
      created_by: auth.userId,
    })
    .select(
      "id, document_id, processo_id, subject_type, subject_id, permission, created_by, created_at, updated_at, deleted_at"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: loaded.data!.processo_id,
    document_id: ctx.params.id,
    action: "document.permission_add",
    detail: {
      subject_type: body.subject_type,
      subject_id: subjectId,
      permission: body.permission,
    },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true, permission: data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const meta = requestAuditMeta(req);
  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const permId = req.nextUrl.searchParams.get("permission_id");
  if (!permId) {
    return NextResponse.json(
      { ok: false, error: "Informe permission_id." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("gd_document_permissions")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", permId)
    .eq("document_id", ctx.params.id)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: loaded.data!.processo_id,
    document_id: ctx.params.id,
    action: "document.permission_remove",
    detail: { permission_id: permId },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ ok: true });
}
