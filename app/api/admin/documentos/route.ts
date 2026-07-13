import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  isGdDocumentStatus,
  listarDocumentos,
  registrarLog,
  validarTituloDocumento,
  tabelaAusente,
} from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";

export async function GET(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const statusParam = req.nextUrl.searchParams.get("status")?.trim() || "";
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const favorite = req.nextUrl.searchParams.get("favorite") === "1";
  const onlyDeleted = req.nextUrl.searchParams.get("deleted") === "1";
  const folderId = req.nextUrl.searchParams.get("folder_id")?.trim() || "";
  const categoryId =
    req.nextUrl.searchParams.get("category_id")?.trim() || "";
  const status = isGdDocumentStatus(statusParam) ? statusParam : undefined;

  const processoIds = processoIdsDoEscopo(auth.contexto);
  const processoFiltro =
    processoIds === "todos"
      ? undefined
      : processoIds.length === 1
        ? processoIds[0]
        : undefined;

  const { data, error } = await listarDocumentos({
    processoId: processoFiltro,
    status,
    q: q || undefined,
    favorite: favorite || undefined,
    folderId: folderId || undefined,
    categoryId: categoryId || undefined,
    onlyDeleted,
  });

  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return NextResponse.json({
        ok: true,
        documents: [],
        aviso:
          "Tabelas da Gestão Documental ausentes. Aplique docs/sql/gestao-documental-fase-1.sql no Supabase.",
      });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  let documents = data || [];
  if (processoIds !== "todos" && processoIds.length > 1) {
    documents = documents.filter((d) =>
      registroNoEscopoProcesso(d.processo_id, processoIds)
    );
  } else if (processoIds !== "todos" && processoIds.length === 0) {
    documents = [];
  }

  return NextResponse.json({ ok: true, documents });
}

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      title?: string;
      description?: string;
      number?: string;
      processo_id?: string | null;
      folder_id?: string | null;
      category_id?: string | null;
      status?: string;
    };

    const title = validarTituloDocumento(body.title);
    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Título é obrigatório." },
        { status: 400 }
      );
    }

    const processoIds = processoIdsDoEscopo(auth.contexto);
    let processoId = body.processo_id || null;
    if (processoIds !== "todos") {
      if (!processoId && processoIds.length === 1) {
        processoId = processoIds[0];
      }
      if (!registroNoEscopoProcesso(processoId, processoIds)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Processo fora do seu escopo de acesso.",
          },
          { status: 403 }
        );
      }
    }

    const status =
      body.status && isGdDocumentStatus(body.status) ? body.status : "draft";

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("gd_documents")
      .insert({
        title,
        description: body.description?.trim() || null,
        number: body.number?.trim() || null,
        processo_id: processoId,
        folder_id: body.folder_id || null,
        category_id: body.category_id || null,
        status,
        created_by: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .select(
        "id, processo_id, folder_id, category_id, title, number, description, status, current_version, favorite, storage_path, mime_type, file_name, file_size, file_hash, created_by, created_at, updated_at, deleted_at"
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
      document_id: data.id,
      action: "document.create",
      detail: { title },
      actor_id: auth.userId,
      actor_email: auth.contexto.email,
    });

    return NextResponse.json({ ok: true, document: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar documento.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
