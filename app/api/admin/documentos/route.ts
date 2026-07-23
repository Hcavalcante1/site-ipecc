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
  const processoFiltroMulti =
    processoIds !== "todos" && processoIds.length > 1 ? processoIds : undefined;

  const { data, error } = await listarDocumentos({
    processoId: processoFiltro,
    processoIds: processoFiltroMulti,
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

export async function DELETE(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const esvaziar = req.nextUrl.searchParams.get("esvaziar") === "1";
  if (!esvaziar) {
    return NextResponse.json(
      { ok: false, error: "Parâmetro esvaziar=1 obrigatório." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const processoIds = processoIdsDoEscopo(auth.contexto);

  let docsQuery = admin
    .from("gd_documents")
    .select("id")
    .not("deleted_at", "is", null);

  if (processoIds !== "todos") {
    if (processoIds.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }
    docsQuery = docsQuery.in("processo_id", processoIds);
  }

  const { data: docs, error: docsError } = await docsQuery;
  if (docsError) {
    return NextResponse.json(
      { ok: false, error: docsError.message },
      { status: 500 }
    );
  }

  const docIds = (docs || []).map((d) => d.id).filter((id): id is string => Boolean(id));
  if (docIds.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  // IDs intermediários para cascade de netos
  const { data: advTxRows } = await admin.from("gd_adv_transactions").select("id").in("document_id", docIds);
  const advTxIds = (advTxRows || []).map((r) => r.id).filter(Boolean) as string[];

  const { data: certTxRows } = await admin.from("gd_cert_transactions").select("id").in("document_id", docIds);
  const certTxIds = (certTxRows || []).map((r) => r.id).filter(Boolean) as string[];

  const { data: sigDocRows } = await admin.from("gd_signature_documents").select("id").in("document_id", docIds);
  const sigDocIds = (sigDocRows || []).map((r) => r.id).filter(Boolean) as string[];

  // Netos de adv_transactions (gd_adv_artifacts é append-only, ignorar erro)
  if (advTxIds.length > 0) {
    await admin.from("gd_adv_events").delete().in("transaction_id", advTxIds);
    await admin.from("gd_adv_auth_challenges").delete().in("transaction_id", advTxIds);
    await admin.from("gd_adv_consents").delete().in("transaction_id", advTxIds);
  }

  // Netos de cert_transactions
  if (certTxIds.length > 0) {
    await admin.from("gd_cert_artifacts").delete().in("transaction_id", certTxIds);
    await admin.from("gd_cert_events").delete().in("transaction_id", certTxIds);
  }

  // Netos de signature_documents / signature_signers
  if (sigDocIds.length > 0) {
    await admin.from("gd_signature_evidences").delete().in("signature_document_id", sigDocIds);
    await admin.from("gd_signature_events").delete().in("signature_document_id", sigDocIds);
    await admin.from("gd_oauth_states").delete().in("signature_document_id", sigDocIds);
    await admin.from("gd_signature_otp_challenges").delete().in("signature_document_id", sigDocIds);
  }

  // Cascade principal por document_id
  await admin.from("gd_adv_batch_items").delete().in("document_id", docIds);
  await admin.from("gd_cert_batch_items").delete().in("document_id", docIds);
  await admin.from("gd_signature_batch_items").delete().in("document_id", docIds);
  await admin.from("gd_signature_signers").delete().in("document_id", docIds);
  await admin.from("gd_adv_transactions").delete().in("document_id", docIds);
  await admin.from("gd_cert_transactions").delete().in("document_id", docIds);
  await admin.from("gd_signature_documents").delete().in("document_id", docIds);
  await admin.from("gd_notifications").delete().in("document_id", docIds);
  await admin.from("gd_document_permissions").delete().in("document_id", docIds);
  await admin.from("gd_workflow_history").delete().in("document_id", docIds);
  await admin.from("gd_document_tags").delete().in("document_id", docIds);
  await admin.from("gd_document_logs").delete().in("document_id", docIds);
  await admin.from("gd_document_versions").delete().in("document_id", docIds);

  const { error: delError } = await admin.from("gd_documents").delete().in("id", docIds);
  if (delError) {
    return NextResponse.json(
      { ok: false, error: delError.message },
      { status: 500 }
    );
  }

  await registrarLog({
    processo_id: null,
    document_id: null,
    action: "document.empty_trash",
    detail: { count: docIds.length },
    actor_id: auth.userId,
    actor_email: auth.contexto.email,
  });

  return NextResponse.json({ ok: true, deleted: docIds.length });
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
