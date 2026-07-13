import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  carregarDocumentoNoEscopo,
  listarTagsDocumento,
  normalizarTag,
  registrarLog,
} from "@/lib/documentos";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const { data, error } = await listarTagsDocumento(ctx.params.id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, tags: data || [] });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const body = (await req.json()) as { tag?: string };
  const tag = normalizarTag(String(body.tag || ""));
  if (!tag) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Tag inválida. Use letras, números, hífen ou barra (ex.: contrato/2026).",
      },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_document_tags")
    .upsert(
      {
        document_id: ctx.params.id,
        tag,
        created_by: auth.userId,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "document_id,tag" }
    )
    .select("id, document_id, tag, created_at")
    .single();

  if (error) {
    // unique pode exigir soft-restore
    const existing = await admin
      .from("gd_document_tags")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("document_id", ctx.params.id)
      .eq("tag", tag)
      .select("id, document_id, tag, created_at")
      .maybeSingle();
    if (existing.error || !existing.data) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    await registrarLog({
      processo_id: loaded.data!.processo_id,
      document_id: ctx.params.id,
      action: "document.tag_add",
      detail: { tag },
      actor_id: auth.userId,
      actor_email: auth.contexto.email,
    });
    return NextResponse.json({ ok: true, tag: existing.data });
  }

  await registrarLog({
    processo_id: loaded.data!.processo_id,
    document_id: ctx.params.id,
    action: "document.tag_add",
    detail: { tag },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
  });

  return NextResponse.json({ ok: true, tag: data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const loaded = await carregarDocumentoNoEscopo(ctx.params.id, auth);
  if ("error" in loaded && loaded.error) return loaded.error;

  const tag = normalizarTag(
    String(req.nextUrl.searchParams.get("tag") || "")
  );
  if (!tag) {
    return NextResponse.json(
      { ok: false, error: "Informe a tag a remover (?tag=...)." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("gd_document_tags")
    .update({ deleted_at: now, updated_at: now })
    .eq("document_id", ctx.params.id)
    .eq("tag", tag)
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
    action: "document.tag_remove",
    detail: { tag },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
  });

  return NextResponse.json({ ok: true });
}
