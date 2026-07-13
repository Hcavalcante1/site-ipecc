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
  SIGNER_SELECT,
  listarSignatarios,
  tabelaAssinaturaAusente,
} from "@/lib/documentos/signatureService";
import { carregarDocumentoNoEscopo } from "@/lib/documentos/scopeHelper";
import { notificarEventoDocumental } from "@/lib/documentos/notificationsService";

export async function GET(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  const documentId = req.nextUrl.searchParams.get("document_id") || undefined;
  const batchId = req.nextUrl.searchParams.get("batch_id") || undefined;

  const { data, error } = await listarSignatarios({ documentId, batchId });
  if (error) {
    if (tabelaAssinaturaAusente(error.message, error.code)) {
      return NextResponse.json({
        ok: true,
        signers: [],
        aviso:
          "Tabelas de signatários ausentes. Aplique o SQL da Gestão Documental.",
      });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  // Filtro de escopo por documento do signatário
  const processoIds = processoIdsDoEscopo(auth.contexto);
  if (processoIds === "todos") {
    return NextResponse.json({ ok: true, signers: data || [] });
  }

  const docIds = [
    ...new Set((data || []).map((s) => s.document_id).filter(Boolean)),
  ] as string[];
  if (docIds.length === 0) {
    return NextResponse.json({ ok: true, signers: data || [] });
  }
  const admin = getSupabaseAdmin();
  const docs = await admin
    .from("gd_documents")
    .select("id, processo_id")
    .in("id", docIds);
  const allowed = new Set(
    (docs.data || [])
      .filter((d) => registroNoEscopoProcesso(d.processo_id, processoIds))
      .map((d) => d.id)
  );

  return NextResponse.json({
    ok: true,
    signers: (data || []).filter(
      (s) => !s.document_id || allowed.has(s.document_id)
    ),
  });
}

export async function POST(req: NextRequest) {
  const { denied, auth } = await denyIfSemModuloDocumentos();
  if (denied || !auth) return denied!;

  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      cpf?: string;
      document_id?: string;
      batch_id?: string;
      mode?: "sequential" | "parallel";
      required?: boolean;
      sort_order?: number;
      deadline_at?: string | null;
      user_id?: string | null;
    };

    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Nome do signatário é obrigatório." },
        { status: 400 }
      );
    }
    if (!body.document_id && !body.batch_id) {
      return NextResponse.json(
        { ok: false, error: "Informe document_id ou batch_id." },
        { status: 400 }
      );
    }

    let processoId: string | null = null;
    if (body.document_id) {
      const loaded = await carregarDocumentoNoEscopo(body.document_id, auth);
      if (loaded.error) return loaded.error;
      processoId = loaded.data!.processo_id;
    }

    if (body.batch_id) {
      const admin = getSupabaseAdmin();
      const processoIds = processoIdsDoEscopo(auth.contexto);
      const { data: batch } = await admin
        .from("gd_signature_batches")
        .select("id, processo_id")
        .eq("id", body.batch_id)
        .is("deleted_at", null)
        .maybeSingle();
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
      processoId = batch.processo_id;
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("gd_signature_signers")
      .insert({
        name,
        email: body.email?.trim() || null,
        cpf: body.cpf?.trim() || null,
        document_id: body.document_id || null,
        batch_id: body.batch_id || null,
        mode: body.mode === "sequential" ? "sequential" : "parallel",
        required: body.required !== false,
        sort_order: Number(body.sort_order) || 0,
        deadline_at: body.deadline_at || null,
        user_id: body.user_id || null,
        status: "pending",
        created_by: auth.userId,
      })
      .select(SIGNER_SELECT)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const meta = requestAuditMeta(req);
    await registrarLog({
      processo_id: processoId,
      document_id: body.document_id || null,
      batch_id: body.batch_id || null,
      action: "signatario_adicionado",
      detail: { signer_id: data.id, name, email: data.email },
      actor_id: auth.userId,
      actor_email: auth.contexto.email,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });

    if (data.email || data.user_id) {
      await notificarEventoDocumental({
        event_type: "signatario_convidado",
        title: `Você foi convidado a assinar`,
        body: `${name} foi adicionado como signatário.`,
        document_id: body.document_id || null,
        batch_id: body.batch_id || null,
        processo_id: processoId,
        user_id: data.user_id,
        email: data.email,
        channel: data.user_id ? "in_app" : "email",
        link_path: body.document_id
          ? `/admin/documentos/documentos/${body.document_id}`
          : "/admin/documentos/signatarios",
        created_by: auth.userId,
      });
    }

    return NextResponse.json({ ok: true, signer: data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao criar signatário.",
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
      sort_order?: number;
      mode?: "sequential" | "parallel";
      rejection_reason?: string;
    };
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id é obrigatório." },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.sort_order === "number") patch.sort_order = body.sort_order;
    if (body.mode) patch.mode = body.mode;
    if (body.status) {
      const allowed = [
        "pending",
        "notified",
        "signed",
        "rejected",
        "expired",
        "cancelled",
      ];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { ok: false, error: "Status inválido." },
          { status: 400 }
        );
      }
      patch.status = body.status;
      if (body.status === "signed") {
        patch.signed_at = new Date().toISOString();
      }
      if (body.status === "rejected") {
        patch.rejection_reason = body.rejection_reason || null;
      }
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("gd_signature_signers")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null)
      .select(SIGNER_SELECT)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Signatário não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, signer: data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Erro ao atualizar signatário.",
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
  await admin
    .from("gd_signature_signers")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
