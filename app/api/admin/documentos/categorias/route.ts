import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  registrarLog,
  slugify,
} from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";

function tabelaAusente(message?: string, code?: string) {
  return (
    code === "42P01" ||
    /relation .* does not exist|could not find the table/i.test(message || "")
  );
}

export async function GET() {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_categories")
    .select(
      "id, processo_id, name, slug, description, created_by, created_at, updated_at, deleted_at"
    )
    .is("deleted_at", null)
    .order("name");

  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return NextResponse.json({
        ok: true,
        categories: [],
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
  const categories = (data || []).filter((c) =>
    registroNoEscopoProcesso(c.processo_id, processoIds)
  );

  return NextResponse.json({ ok: true, categories });
}

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      processo_id?: string | null;
    };
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Nome da categoria é obrigatório." },
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
      .from("gd_categories")
      .insert({
        name,
        slug: slugify(name) || null,
        description: body.description?.trim() || null,
        processo_id: processoId,
        created_by: auth.userId,
      })
      .select(
        "id, processo_id, name, slug, description, created_by, created_at, updated_at, deleted_at"
      )
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
      action: "category.create",
      detail: { id: data.id, name },
      actor_id: auth.userId,
      actor_email: auth.contexto.email,
    });

    return NextResponse.json({ ok: true, category: data });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao criar categoria.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Identificador da categoria é obrigatório." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data: cat } = await admin
    .from("gd_categories")
    .select("id, processo_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!cat) {
    return NextResponse.json(
      { ok: false, error: "Categoria não encontrada." },
      { status: 404 }
    );
  }

  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (!registroNoEscopoProcesso(cat.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Categoria fora do seu escopo." },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("gd_categories")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: cat.processo_id,
    action: "category.soft_delete",
    detail: { id },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
  });

  return NextResponse.json({ ok: true });
}
