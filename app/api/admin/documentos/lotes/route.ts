import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  denyIfSemModuloDocumentos,
  registrarLog,
  requestAuditMeta,
} from "@/lib/documentos";
import {
  processoIdsDoEscopo,
  registroNoEscopoProcesso,
} from "@/lib/auth/adminEscopo";
import {
  BATCH_SELECT,
  listarItensLote,
  listarLotes,
  resolverProviderPadrao,
  tabelaAssinaturaAusente,
} from "@/lib/documentos/signatureService";
import { notificarEventoDocumental } from "@/lib/documentos/notificationsService";

export async function GET(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const id = req.nextUrl.searchParams.get("id");
  const processoIds = processoIdsDoEscopo(auth.contexto);

  if (id) {
    const admin = getSupabaseAdmin();
    const { data: batch, error } = await admin
      .from("gd_signature_batches")
      .select(BATCH_SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    if (!batch) {
      return NextResponse.json(
        { ok: false, error: "Lote não encontrado." },
        { status: 404 }
      );
    }
    if (!registroNoEscopoProcesso(batch.processo_id, processoIds)) {
      return NextResponse.json(
        { ok: false, error: "Lote fora do seu escopo." },
        { status: 403 }
      );
    }
    const items = await listarItensLote(id);
    return NextResponse.json({
      ok: true,
      batch,
      items: items.data || [],
    });
  }

  const { data, error } = await listarLotes(processoIds);
  if (error) {
    if (tabelaAssinaturaAusente(error.message, error.code)) {
      return NextResponse.json({
        ok: true,
        batches: [],
        aviso:
          "Tabelas de lotes ausentes. Aplique o SQL da Gestão Documental no Supabase.",
      });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, batches: data || [] });
}

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      title?: string;
      processo_id?: string | null;
      document_ids?: string[];
      provider_code?: string;
    };

    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Título do lote é obrigatório." },
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

    const documentIds = Array.isArray(body.document_ids)
      ? body.document_ids.filter(Boolean)
      : [];

    const providerCodeRaw = String(body.provider_code || "")
      .trim()
      .toLowerCase();
    const providerCode =
      providerCodeRaw === "documenso"
        ? "documento"
        : providerCodeRaw ||
          resolverProviderPadrao() ||
          "ipecc";

    const admin = getSupabaseAdmin();
    const { data: batch, error } = await admin
      .from("gd_signature_batches")
      .insert({
        title,
        processo_id: processoId,
        provider_code: providerCode,
        status: "draft",
        progress_done: 0,
        progress_total: documentIds.length,
        created_by: auth.userId,
      })
      .select(BATCH_SELECT)
      .single();

    if (error) {
      if (tabelaAssinaturaAusente(error.message, error.code)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Tabelas de lotes ausentes. Aplique docs/sql/gestao-documental-fase-1.sql.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (documentIds.length > 0) {
      await admin.from("gd_signature_batch_items").insert(
        documentIds.map((document_id, idx) => ({
          batch_id: batch.id,
          document_id,
          status: "pending",
          sort_order: idx,
          created_by: auth.userId,
        }))
      );
    }

    const meta = requestAuditMeta(req);
    await registrarLog({
      processo_id: processoId,
      batch_id: batch.id,
      action: "lote_criado",
      detail: { title, document_ids: documentIds },
      actor_id: auth.userId,
      actor_email: auth.contexto.email,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });

    await notificarEventoDocumental({
      event_type: "lote_criado",
      title: `Lote criado: ${title}`,
      body: `${documentIds.length} documento(s) no lote.`,
      batch_id: batch.id,
      processo_id: processoId,
      user_id: auth.userId,
      link_path: "/admin/documentos/lotes",
      created_by: auth.userId,
    });

    const items = await listarItensLote(batch.id);
    return NextResponse.json({
      ok: true,
      batch,
      items: items.data || [],
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao criar lote.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      id?: string;
      status?: string;
      title?: string;
      add_document_ids?: string[];
    };
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id é obrigatório." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const processoIds = processoIdsDoEscopo(auth.contexto);
    const { data: existing } = await admin
      .from("gd_signature_batches")
      .select(BATCH_SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Lote não encontrado." },
        { status: 404 }
      );
    }
    if (!registroNoEscopoProcesso(existing.processo_id, processoIds)) {
      return NextResponse.json(
        { ok: false, error: "Lote fora do seu escopo." },
        { status: 403 }
      );
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title) patch.title = body.title.trim();
    if (body.status) {
      const allowed = [
        "draft",
        "ready",
        "running",
        "paused",
        "completed",
        "failed",
        "cancelled",
      ];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { ok: false, error: "Status de lote inválido." },
          { status: 400 }
        );
      }
      patch.status = body.status;
    }

    if (Array.isArray(body.add_document_ids) && body.add_document_ids.length) {
      const items = await listarItensLote(id);
      const maxOrder = Math.max(
        0,
        ...(items.data || []).map((i) => i.sort_order || 0)
      );
      await admin.from("gd_signature_batch_items").insert(
        body.add_document_ids.map((document_id, idx) => ({
          batch_id: id,
          document_id,
          status: "pending",
          sort_order: maxOrder + idx + 1,
          created_by: auth.userId,
        }))
      );
      patch.progress_total =
        (existing.progress_total || 0) + body.add_document_ids.length;
    }

    const { data, error } = await admin
      .from("gd_signature_batches")
      .update(patch)
      .eq("id", id)
      .select(BATCH_SELECT)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const items = await listarItensLote(id);
    return NextResponse.json({ ok: true, batch: data, items: items.data || [] });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao atualizar lote.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "id é obrigatório." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const processoIds = processoIdsDoEscopo(auth.contexto);
  const { data: existing } = await admin
    .from("gd_signature_batches")
    .select("id, processo_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Lote não encontrado." },
      { status: 404 }
    );
  }
  if (!registroNoEscopoProcesso(existing.processo_id, processoIds)) {
    return NextResponse.json(
      { ok: false, error: "Lote fora do seu escopo." },
      { status: 403 }
    );
  }

  await admin
    .from("gd_signature_batches")
    .update({
      deleted_at: new Date().toISOString(),
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
