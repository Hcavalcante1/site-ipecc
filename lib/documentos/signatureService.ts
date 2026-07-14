import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "./types";
import { registrarLog } from "./documentsService";
import {
  DocumentoProvider,
  documentoConfigurado,
  pickRecipientSigning,
} from "./signature/DocumentoProvider";
import {
  GovBrProvider,
  govbrConfigurado,
  govbrRedirectUriPadrao,
} from "./signature/GovBrProvider";
import { ipeccConfigurado } from "./signature/IpeccProvider";
import { notificarEventoDocumental } from "./notificationsService";

export type SignatureProviderCode = "ipecc" | "documento" | "govbr";

/** eu_assino = admin assina no painel; enviar_signatarios = e-mail externo. */
export type ModoAssinatura = "eu_assino" | "enviar_signatarios";

export type AssinaturaLinks = {
  signingUrl: string | null;
  embedUrl: string | null;
  token: string | null;
};

export function resolverProviderPadrao(): SignatureProviderCode | null {
  if (ipeccConfigurado()) return "ipecc";
  if (documentoConfigurado()) return "documento";
  if (govbrConfigurado()) return "govbr";
  return null;
}

function isDocumentoProvider(code: string | null | undefined) {
  return code === "documento" || code === "documenso";
}

export const SIG_DOC_SELECT =
  "id, document_id, version_id, provider_id, provider_code, status, external_session_id, signed_storage_path, signed_hash, error_message, created_by, created_at, updated_at, deleted_at";

export const BATCH_SELECT =
  "id, processo_id, title, provider_code, status, progress_done, progress_total, error_message, created_by, created_at, updated_at, deleted_at";

export const SIGNER_SELECT =
  "id, signature_document_id, batch_id, document_id, name, email, cpf, user_id, mode, required, sort_order, deadline_at, status, signed_at, rejection_reason, cargo, role_code, created_by, created_at, updated_at, deleted_at";

export const BATCH_ITEM_SELECT =
  "id, batch_id, document_id, signature_document_id, status, error_message, sort_order, created_by, created_at, updated_at, deleted_at";

function tabelaAusente(message?: string, code?: string) {
  return (
    code === "42P01" ||
    /relation .* does not exist|could not find the table/i.test(message || "")
  );
}

export {
  tabelaAusente as tabelaAssinaturaAusente,
  govbrConfigurado,
  documentoConfigurado,
  documentoConfigurado as documensoConfigurado,
};

export async function listarAssinaturas(opts?: {
  processoIds?: string[] | "todos";
  documentId?: string;
  limit?: number;
}) {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("gd_signature_documents")
    .select(SIG_DOC_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.documentId) {
    query = query.eq("document_id", opts.documentId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error };

  let rows = data || [];

  if (opts?.processoIds && opts.processoIds !== "todos") {
    const docIds = [...new Set(rows.map((r) => r.document_id))];
    if (docIds.length === 0) return { data: [], error: null };
    const docs = await admin
      .from("gd_documents")
      .select("id, processo_id, title")
      .in("id", docIds);
    const allowed = new Set(
      (docs.data || [])
        .filter(
          (d) =>
            !d.processo_id ||
            (opts.processoIds as string[]).includes(d.processo_id)
        )
        .map((d) => d.id)
    );
    const titleById = new Map(
      (docs.data || []).map((d) => [d.id, d.title as string | null])
    );
    return {
      data: rows
        .filter((r) => allowed.has(r.document_id))
        .map((r) => ({
          ...r,
          document_title: titleById.get(r.document_id) || null,
        })),
      error: null,
    };
  }

  const docIds = [...new Set(rows.map((r) => r.document_id))];
  if (docIds.length > 0) {
    const docs = await admin
      .from("gd_documents")
      .select("id, title")
      .in("id", docIds);
    const titleById = new Map(
      (docs.data || []).map((d) => [d.id, d.title as string | null])
    );
    rows = rows.map((r) => ({
      ...r,
      document_title: titleById.get(r.document_id) || null,
    }));
  }

  return { data: rows, error: null };
}

export async function excluirAssinaturaDocumento(opts: {
  id: string;
  userId: string;
  actorEmail?: string | null;
}) {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("gd_signature_documents")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", opts.id)
    .is("deleted_at", null)
    .select(SIG_DOC_SELECT)
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data) {
    return {
      data: null,
      error: { message: "Pedido não encontrado.", code: "NOT_FOUND" },
    };
  }

  await registrarLog({
    action: "assinatura_excluida",
    document_id: data.document_id,
    actor_id: opts.userId,
    actor_email: opts.actorEmail || null,
    detail: {
      signature_document_id: data.id,
      status: data.status,
      provider_code: data.provider_code,
    },
  });

  return { data, error: null };
}

export async function criarAssinaturaDocumento(opts: {
  documentId: string;
  versionId?: string | null;
  userId: string;
  actorEmail?: string | null;
  processoId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  providerCode?: SignatureProviderCode | string | null;
  signerEmail?: string | null;
  signerName?: string | null;
  /** Se true (padrão Documento), cria envelope e envia e-mail ao signatário. */
  distribute?: boolean;
  /** Assinar no admin (eu) ou enviar a signatários externos. */
  modo?: ModoAssinatura;
}) {
  const admin = getSupabaseAdmin();
  const requested = String(opts.providerCode || "").trim().toLowerCase();
  const normalized =
    requested === "documenso" ? "documento" : requested;
  const code =
    (normalized === "ipecc" ||
    normalized === "documento" ||
    normalized === "govbr"
      ? (normalized as SignatureProviderCode)
      : null) || resolverProviderPadrao();
  const modo: ModoAssinatura =
    opts.modo === "eu_assino" ? "eu_assino" : "enviar_signatarios";

  if (!code) {
    return {
      data: null,
      error: {
        message:
          "Nenhum provedor de assinatura configurado. O padrão é Assinatura Eletrônica IPECC.",
        code: "NO_PROVIDER",
      },
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  if (code === "documento" && !documentoConfigurado()) {
    return {
      data: null,
      error: {
        message:
          "Assinatura Documento (legado) não configurada. Prefira o motor IPECC ou defina DOCUMENTO_API_URL e DOCUMENTO_API_TOKEN.",
        code: "DOCUMENTO_MISSING",
      },
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  if (code === "govbr" && !govbrConfigurado()) {
    return {
      data: null,
      error: {
        message:
          "gov.br não configurado. Esse provedor é só para órgãos públicos com credenciais ITI.",
        code: "GOVBR_MISSING",
      },
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  const provider = await admin
    .from("gd_signature_providers")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  const { data, error } = await admin
    .from("gd_signature_documents")
    .insert({
      document_id: opts.documentId,
      version_id: opts.versionId || null,
      provider_id: provider.data?.id || null,
      provider_code: code,
      status: "pending",
      created_by: opts.userId,
    })
    .select(SIG_DOC_SELECT)
    .single();

  if (error || !data) {
    return {
      data,
      error,
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  let signerEmail = String(opts.signerEmail || "").trim().toLowerCase();
  let signerName = String(opts.signerName || signerEmail || "").trim();

  if (modo === "eu_assino") {
    const actor = String(opts.actorEmail || "").trim().toLowerCase();
    if (!actor || !actor.includes("@")) {
      return {
        data,
        error: {
          message:
            "Não foi possível identificar o e-mail do usuário logado para assinar no admin.",
          code: "NO_ACTOR_EMAIL",
        },
        signingUrl: null as string | null,
        embedUrl: null as string | null,
      };
    }
    signerEmail = actor;
    signerName =
      String(opts.signerName || "").trim() ||
      actor.split("@")[0] ||
      actor;
  }

  if (signerEmail) {
    await admin.from("gd_signature_signers").insert({
      signature_document_id: data.id,
      document_id: opts.documentId,
      name: signerName || signerEmail,
      email: signerEmail,
      mode: "sequential",
      required: true,
      sort_order: 0,
      status: "pending",
      created_by: opts.userId,
    });
  }

  await registrarLog({
    processo_id: opts.processoId,
    document_id: opts.documentId,
    action: "assinatura_criada",
    detail: {
      signature_document_id: data.id,
      provider_code: code,
      modo,
    },
    actor_id: opts.userId,
    actor_email: opts.actorEmail,
    ip: opts.ip,
    user_agent: opts.userAgent,
  });
  await notificarEventoDocumental({
    event_type: "assinatura_criada",
    title: "Pedido de assinatura criado",
    body:
      modo === "eu_assino"
        ? `Documento pronto para você assinar no admin (${code}).`
        : `Documento encaminhado para assinatura (${code}).`,
    document_id: opts.documentId,
    processo_id: opts.processoId,
    user_id: opts.userId,
    link_path: `/admin/documentos/assinaturas`,
    created_by: opts.userId,
  });

  const shouldDistribute =
    code === "documento" &&
    opts.distribute !== false &&
    Boolean(signerEmail);

  if (code === "ipecc") {
    await admin
      .from("gd_signature_documents")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", data.id);
    return {
      data: { ...data, status: "ready" },
      error: null,
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  if (shouldDistribute) {
    const sent = await enviarParaAssinaturaDocumento({
      signatureDocumentId: data.id,
      userId: opts.userId,
      actorEmail: opts.actorEmail,
      ip: opts.ip,
      userAgent: opts.userAgent,
      signerEmail,
      signerName: signerName || signerEmail,
      modo,
    });
    if (sent.error) {
      return {
        data: sent.data || data,
        error: { message: sent.error },
        signingUrl: sent.signingUrl ?? null,
        embedUrl: sent.embedUrl ?? null,
      };
    }
    return {
      data: sent.data || data,
      error: null,
      signingUrl: sent.signingUrl ?? null,
      embedUrl: sent.embedUrl ?? null,
    };
  }

  return {
    data,
    error: null,
    signingUrl: null as string | null,
    embedUrl: null as string | null,
  };
}

export async function enviarParaAssinaturaDocumento(opts: {
  signatureDocumentId: string;
  userId: string;
  actorEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  signerEmail?: string | null;
  signerName?: string | null;
  modo?: ModoAssinatura;
}) {
  if (!documentoConfigurado()) {
    return {
      error:
        "Assinatura Documento não configurada. Defina DOCUMENTO_API_TOKEN no servidor.",
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  const admin = getSupabaseAdmin();
  const modo: ModoAssinatura =
    opts.modo === "eu_assino" ? "eu_assino" : "enviar_signatarios";
  const { data: sig } = await admin
    .from("gd_signature_documents")
    .select(SIG_DOC_SELECT)
    .eq("id", opts.signatureDocumentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!sig) {
    return {
      error: "Pedido de assinatura não encontrado.",
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }
  if (!isDocumentoProvider(sig.provider_code)) {
    return {
      error: "Este pedido não usa o provedor Documento.",
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  let signerEmail = String(opts.signerEmail || "").trim().toLowerCase();
  let signerName = String(opts.signerName || "").trim();

  if (modo === "eu_assino") {
    const actor = String(opts.actorEmail || "").trim().toLowerCase();
    if (actor && actor.includes("@")) {
      signerEmail = actor;
      if (!signerName) signerName = actor.split("@")[0] || actor;
    }
  }

  if (!signerEmail) {
    const { data: signers } = await admin
      .from("gd_signature_signers")
      .select("email, name")
      .eq("signature_document_id", sig.id)
      .is("deleted_at", null)
      .order("sort_order")
      .limit(1);
    signerEmail = String(signers?.[0]?.email || "").trim().toLowerCase();
    signerName = String(signers?.[0]?.name || signerEmail).trim();
  }

  if (!signerEmail) {
    return {
      error:
        modo === "eu_assino"
          ? "Não foi possível identificar o e-mail do usuário logado."
          : "Informe o e-mail do signatário para enviar a assinatura.",
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  const { data: doc } = await admin
    .from("gd_documents")
    .select(
      "id, processo_id, title, storage_path, file_name, mime_type, status"
    )
    .eq("id", sig.document_id)
    .maybeSingle();

  if (!doc?.storage_path) {
    return {
      error: "Documento sem arquivo para assinar.",
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  const downloaded = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(doc.storage_path);
  if (downloaded.error || !downloaded.data) {
    return {
      error:
        downloaded.error?.message ||
        "Não foi possível baixar o PDF do Storage.",
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }

  const pdfBytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const fileName =
    doc.file_name && /\.pdf$/i.test(doc.file_name)
      ? doc.file_name
      : `${(doc.title || "documento").replace(/[^\w.-]+/g, "_")}.pdf`;

  await admin
    .from("gd_signature_documents")
    .update({ status: "signing", updated_at: new Date().toISOString() })
    .eq("id", sig.id);

  try {
    const provider = new DocumentoProvider();
    const envelope = await provider.createAndDistribute({
      title: doc.title || "Documento IPECC",
      pdfBytes,
      fileName,
      externalId: sig.id,
      recipients: [
        {
          email: signerEmail,
          name: signerName || signerEmail,
          role: "SIGNER",
        },
      ],
    });

    const links = pickRecipientSigning(envelope, signerEmail);

    const { data: updated, error } = await admin
      .from("gd_signature_documents")
      .update({
        status: "pending",
        external_session_id: envelope.id,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sig.id)
      .select(SIG_DOC_SELECT)
      .single();

    if (error) throw new Error(error.message);

    await admin.from("gd_signature_events").insert({
      signature_document_id: sig.id,
      event_type:
        modo === "eu_assino" ? "documento_pronto_admin" : "documento_enviado",
      payload: {
        envelope_id: envelope.id,
        signer_email: signerEmail,
        modo,
        embed_url: links.embedUrl,
      },
      ip: opts.ip,
      user_agent: opts.userAgent,
      created_by: opts.userId,
    });

    await registrarLog({
      processo_id: doc.processo_id,
      document_id: doc.id,
      action:
        modo === "eu_assino"
          ? "assinatura_pronta_admin"
          : "assinatura_enviada_documento",
      detail: {
        signature_document_id: sig.id,
        envelope_id: envelope.id,
        modo,
      },
      actor_id: opts.userId,
      actor_email: opts.actorEmail,
      ip: opts.ip,
      user_agent: opts.userAgent,
    });

    await notificarEventoDocumental({
      event_type: "assinatura_enviada",
      title:
        modo === "eu_assino"
          ? `Assine no admin: ${doc.title}`
          : `Assinatura enviada: ${doc.title}`,
      body:
        modo === "eu_assino"
          ? "Abra o painel de assinatura no admin para concluir."
          : `Pedido de assinatura enviado para ${signerEmail}.`,
      document_id: doc.id,
      processo_id: doc.processo_id,
      user_id: opts.userId,
      link_path: `/admin/documentos/assinaturas`,
      created_by: opts.userId,
    });

    return {
      data: updated,
      error: null as string | null,
      signingUrl: links.signingUrl,
      embedUrl: links.embedUrl,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("gd_signature_documents")
      .update({
        status: "failed",
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sig.id);
    return {
      error: msg,
      signingUrl: null as string | null,
      embedUrl: null as string | null,
    };
  }
}

/** Recupera link de assinatura de um pedido já enviado (para reabrir no admin). */
export async function obterLinkAssinaturaDocumento(opts: {
  signatureDocumentId: string;
  signerEmail?: string | null;
}): Promise<AssinaturaLinks & { error: string | null }> {
  if (!documentoConfigurado()) {
    return {
      error: "Assinatura Documento não configurada.",
      signingUrl: null,
      embedUrl: null,
      token: null,
    };
  }

  const admin = getSupabaseAdmin();
  const { data: sig } = await admin
    .from("gd_signature_documents")
    .select(SIG_DOC_SELECT)
    .eq("id", opts.signatureDocumentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!sig?.external_session_id) {
    return {
      error: "Pedido ainda sem envelope no motor de assinatura.",
      signingUrl: null,
      embedUrl: null,
      token: null,
    };
  }
  if (!isDocumentoProvider(sig.provider_code)) {
    return {
      error: "Este pedido não usa o provedor Documento.",
      signingUrl: null,
      embedUrl: null,
      token: null,
    };
  }

  try {
    const provider = new DocumentoProvider();
    const envelope = await provider.getEnvelope(sig.external_session_id);
    const links = pickRecipientSigning(envelope, opts.signerEmail);
    if (!links.embedUrl && !links.signingUrl) {
      return {
        error: "Link de assinatura ainda não disponível neste envelope.",
        ...links,
      };
    }
    return { error: null, ...links };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
      signingUrl: null,
      embedUrl: null,
      token: null,
    };
  }
}

export async function concluirAssinaturaDocumentoWebhook(opts: {
  envelopeId: string;
  event?: string | null;
}) {
  const admin = getSupabaseAdmin();
  let { data: sig } = await admin
    .from("gd_signature_documents")
    .select(SIG_DOC_SELECT)
    .eq("external_session_id", opts.envelopeId)
    .in("provider_code", ["documento", "documenso"])
    .is("deleted_at", null)
    .maybeSingle();

  if (!sig) {
    const byId = await admin
      .from("gd_signature_documents")
      .select(SIG_DOC_SELECT)
      .eq("id", opts.envelopeId)
      .in("provider_code", ["documento", "documenso"])
      .is("deleted_at", null)
      .maybeSingle();
    sig = byId.data;
  }

  if (!sig) {
    return { error: "Assinatura local não encontrada para este envelope." };
  }

  const envelopeId = sig.external_session_id || opts.envelopeId;

  if (sig.status === "signed" && sig.signed_storage_path) {
    await import("@/lib/documentos-oficiais")
      .then((m) =>
        m.publicarEmissaoAposAssinatura({
          gdDocumentId: sig.document_id,
          signedStoragePath: sig.signed_storage_path as string,
        })
      )
      .catch(() => null);
    return { data: sig, error: null };
  }

  const { data: doc } = await admin
    .from("gd_documents")
    .select("id, processo_id, title")
    .eq("id", sig.document_id)
    .maybeSingle();

  try {
    const provider = new DocumentoProvider();
    const pdf = await provider.downloadSignedPdf(envelopeId);
    const signedHash = createHash("sha256").update(pdf).digest("hex");
    const signedPath = `${doc?.processo_id || "geral"}/${sig.document_id}/assinado-documento-${Date.now()}.pdf`;

    const upload = await admin.storage
      .from(GD_STORAGE_BUCKET)
      .upload(signedPath, pdf, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upload.error) throw new Error(upload.error.message);

    const { data: updated, error } = await admin
      .from("gd_signature_documents")
      .update({
        status: "signed",
        signed_storage_path: signedPath,
        signed_hash: signedHash,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sig.id)
      .select(SIG_DOC_SELECT)
      .single();
    if (error) throw new Error(error.message);

    await admin
      .from("gd_documents")
      .update({ status: "signed", updated_at: new Date().toISOString() })
      .eq("id", sig.document_id);

    await admin.from("gd_signature_events").insert({
      signature_document_id: sig.id,
      event_type: "signed",
      payload: {
        provider: "documento",
        envelope_id: envelopeId,
        webhook_event: opts.event,
        path: signedPath,
      },
      created_by: sig.created_by,
    });

    await notificarEventoDocumental({
      event_type: "documento_assinado",
      title: `Documento assinado: ${doc?.title || "Documento"}`,
      body: "A assinatura do documento foi concluída com sucesso.",
      document_id: sig.document_id,
      processo_id: doc?.processo_id,
      user_id: sig.created_by,
      link_path: `/admin/documentos/documentos/${sig.document_id}`,
      created_by: sig.created_by,
    });

    await import("@/lib/documentos-oficiais")
      .then((m) =>
        m.publicarEmissaoAposAssinatura({
          gdDocumentId: sig.document_id,
          signedStoragePath: signedPath,
        })
      )
      .catch(() => null);

    return { data: updated, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("gd_signature_documents")
      .update({
        status: "failed",
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sig.id);
    return { error: msg };
  }
}

export async function iniciarAutorizeGovBr(opts: {
  userId: string;
  signatureDocumentId?: string | null;
  batchId?: string | null;
  scope?: "sign" | "signature_session";
}) {
  if (!govbrConfigurado()) {
    return {
      error:
        "Credenciais gov.br ausentes. Configure GOVBR_SIGNATURE_CLIENT_ID e GOVBR_SIGNATURE_CLIENT_SECRET no servidor (Vercel).",
    };
  }

  const provider = new GovBrProvider();
  const redirectUri = govbrRedirectUriPadrao();
  const scope =
    opts.scope || (opts.batchId ? "signature_session" : "sign");
  const scopes = GovBrProvider.montarEscopos(scope);
  const auth = await provider.authorize({
    redirectUri,
    scopes,
  });

  const admin = getSupabaseAdmin();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { error } = await admin.from("gd_oauth_states").upsert({
    state: auth.state,
    user_id: opts.userId,
    signature_document_id: opts.signatureDocumentId || null,
    batch_id: opts.batchId || null,
    scope,
    access_token: null,
    token_expires_at: null,
    expires_at: expires,
  });

  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return {
        error:
          "Tabela gd_oauth_states ausente. Aplique docs/sql/gestao-documental-fase-4-6.sql no Supabase.",
      };
    }
    return { error: error.message };
  }

  if (opts.signatureDocumentId) {
    await admin
      .from("gd_signature_documents")
      .update({ status: "authorizing", updated_at: new Date().toISOString() })
      .eq("id", opts.signatureDocumentId);
  }

  return { authorizationUrl: auth.authorizationUrl, state: auth.state };
}

export async function concluirCallbackGovBr(opts: {
  code: string;
  state: string;
}) {
  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin
    .from("gd_oauth_states")
    .select(
      "state, user_id, signature_document_id, batch_id, scope, expires_at"
    )
    .eq("state", opts.state)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!row) return { error: "Estado OAuth inválido ou expirado." };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from("gd_oauth_states").delete().eq("state", opts.state);
    return { error: "Estado OAuth expirado. Reinicie a autorização." };
  }

  const provider = new GovBrProvider();
  const token = await provider.exchangeCode({
    code: opts.code,
    redirectUri: govbrRedirectUriPadrao(),
  });

  const tokenExpires = token.expiresIn
    ? new Date(Date.now() + token.expiresIn * 1000).toISOString()
    : new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await admin
    .from("gd_oauth_states")
    .update({
      access_token: token.accessToken,
      token_expires_at: tokenExpires,
    })
    .eq("state", opts.state);

  if (row.signature_document_id) {
    await admin
      .from("gd_signature_documents")
      .update({
        status: "ready",
        external_session_id: opts.state,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.signature_document_id);
  }

  return {
    ok: true as const,
    userId: row.user_id,
    signatureDocumentId: row.signature_document_id as string | null,
    batchId: row.batch_id as string | null,
    state: opts.state,
  };
}

export async function executarAssinaturaComToken(opts: {
  signatureDocumentId: string;
  state: string;
  userId: string;
  actorEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const admin = getSupabaseAdmin();
  const { data: oauth } = await admin
    .from("gd_oauth_states")
    .select("*")
    .eq("state", opts.state)
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (!oauth?.access_token) {
    return {
      error:
        "Token OAuth ausente. Autorize novamente com a conta gov.br.",
    };
  }

  const { data: sig } = await admin
    .from("gd_signature_documents")
    .select(SIG_DOC_SELECT)
    .eq("id", opts.signatureDocumentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!sig) return { error: "Pedido de assinatura não encontrado." };

  const { data: doc } = await admin
    .from("gd_documents")
    .select(
      "id, processo_id, title, storage_path, file_hash, file_name, status"
    )
    .eq("id", sig.document_id)
    .maybeSingle();

  if (!doc?.storage_path) {
    return { error: "Documento sem arquivo para assinar." };
  }

  let fileHash = doc.file_hash;
  if (!fileHash) {
    const downloaded = await admin.storage
      .from(GD_STORAGE_BUCKET)
      .download(doc.storage_path);
    if (downloaded.error || !downloaded.data) {
      return {
        error:
          downloaded.error?.message ||
          "Não foi possível baixar o arquivo para calcular o hash.",
      };
    }
      const buf = Buffer.from(await downloaded.data.arrayBuffer());
    fileHash = createHash("sha256").update(buf).digest("hex");
    await admin
      .from("gd_documents")
      .update({ file_hash: fileHash, updated_at: new Date().toISOString() })
      .eq("id", doc.id);
  }

  await admin
    .from("gd_signature_documents")
    .update({ status: "signing", updated_at: new Date().toISOString() })
    .eq("id", sig.id);

  try {
    const provider = new GovBrProvider();
    const { pkcs7, signedHash } = await provider.assinarPkcs7Bytes({
      accessToken: oauth.access_token,
      fileHashSha256Hex: fileHash,
    });

    const signedPath = `${doc.processo_id || "geral"}/${doc.id}/assinado-${Date.now()}.p7s`;
    const upload = await admin.storage
      .from(GD_STORAGE_BUCKET)
      .upload(signedPath, pkcs7, {
        contentType: "application/pkcs7-signature",
        upsert: false,
      });

    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const { data: updated, error } = await admin
      .from("gd_signature_documents")
      .update({
        status: "signed",
        signed_storage_path: signedPath,
        signed_hash: signedHash,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sig.id)
      .select(SIG_DOC_SELECT)
      .single();

    if (error) throw new Error(error.message);

    await admin
      .from("gd_documents")
      .update({
        status: "signed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    await admin.from("gd_signature_events").insert({
      signature_document_id: sig.id,
      event_type: "signed",
      payload: { signed_hash: signedHash, path: signedPath },
      ip: opts.ip,
      user_agent: opts.userAgent,
      created_by: opts.userId,
    });

    await registrarLog({
      processo_id: doc.processo_id,
      document_id: doc.id,
      action: "documento_assinado_govbr",
      detail: { signature_document_id: sig.id, signed_path: signedPath },
      actor_id: opts.userId,
      actor_email: opts.actorEmail,
      ip: opts.ip,
      user_agent: opts.userAgent,
    });

    await notificarEventoDocumental({
      event_type: "documento_assinado",
      title: `Documento assinado: ${doc.title}`,
      body: "A assinatura digital gov.br foi concluída com sucesso.",
      document_id: doc.id,
      processo_id: doc.processo_id,
      user_id: opts.userId,
      link_path: `/admin/documentos/documentos/${doc.id}`,
      created_by: opts.userId,
    });

    // limpa token após uso
    await admin.from("gd_oauth_states").delete().eq("state", opts.state);

    return { data: updated, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin
      .from("gd_signature_documents")
      .update({
        status: "failed",
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sig.id);
    return { error: msg };
  }
}

/**
 * Envia cada item do lote via provedor Documento (um envelope por PDF).
 */
export async function enviarLoteParaAssinaturaDocumento(opts: {
  batchId: string;
  userId: string;
  actorEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  signerEmail: string;
  signerName?: string | null;
}) {
  const signerEmail = String(opts.signerEmail || "").trim().toLowerCase();
  if (!signerEmail) {
    return { error: "Informe o e-mail do signatário do lote." };
  }
  if (!documentoConfigurado()) {
    return {
      error:
        "Assinatura Documento não configurada. Defina DOCUMENTO_API_URL e DOCUMENTO_API_TOKEN.",
    };
  }

  const admin = getSupabaseAdmin();
  const { data: batch } = await admin
    .from("gd_signature_batches")
    .select(BATCH_SELECT)
    .eq("id", opts.batchId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!batch) return { error: "Lote não encontrado." };
  if (!isDocumentoProvider(batch.provider_code)) {
    await admin
      .from("gd_signature_batches")
      .update({
        provider_code: "documento",
        updated_at: new Date().toISOString(),
      })
      .eq("id", batch.id);
  }

  const { data: items } = await listarItensLote(opts.batchId);
  if (!items?.length) {
    return { error: "Lote sem documentos." };
  }

  await admin
    .from("gd_signature_batches")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", batch.id);

  let done = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      let sigId = item.signature_document_id as string | null;
      if (!sigId) {
        const created = await criarAssinaturaDocumento({
          documentId: item.document_id,
          userId: opts.userId,
          actorEmail: opts.actorEmail,
          processoId: batch.processo_id,
          ip: opts.ip,
          userAgent: opts.userAgent,
          providerCode: "documento",
          signerEmail,
          signerName: opts.signerName,
          distribute: false,
        });
        if (created.error || !created.data) {
          const msg =
            typeof created.error === "object" &&
            created.error &&
            "message" in created.error
              ? String((created.error as { message: string }).message)
              : "Falha ao criar pedido.";
          throw new Error(msg);
        }
        sigId = created.data.id;
        await admin
          .from("gd_signature_batch_items")
          .update({
            signature_document_id: sigId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }

      const sent = await enviarParaAssinaturaDocumento({
        signatureDocumentId: sigId!,
        userId: opts.userId,
        actorEmail: opts.actorEmail,
        ip: opts.ip,
        userAgent: opts.userAgent,
        signerEmail,
        signerName: opts.signerName,
      });
      if (sent.error) throw new Error(sent.error);

      await admin
        .from("gd_signature_batch_items")
        .update({
          status: "running",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      done += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${item.document_id}: ${msg}`);
      await admin
        .from("gd_signature_batch_items")
        .update({
          status: "failed",
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }
  }

  const status =
    done === items.length
      ? "completed"
      : done > 0
        ? "running"
        : "failed";

  await admin
    .from("gd_signature_batches")
    .update({
      status,
      progress_done: done,
      progress_total: items.length,
      error_message: errors.length ? errors.slice(0, 5).join(" | ") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  return {
    data: { done, total: items.length, errors },
    error: done === 0 ? errors[0] || "Nenhum documento enviado." : null,
  };
}

export async function listarLotes(processoIds: string[] | "todos") {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("gd_signature_batches")
    .select(BATCH_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (processoIds !== "todos" && processoIds.length > 0) {
    query = query.in("processo_id", processoIds);
  }

  return query;
}

export async function listarItensLote(batchId: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("gd_signature_batch_items")
    .select(BATCH_ITEM_SELECT)
    .eq("batch_id", batchId)
    .is("deleted_at", null)
    .order("sort_order");
}

export async function listarSignatarios(opts?: {
  documentId?: string;
  batchId?: string;
}) {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("gd_signature_signers")
    .select(SIGNER_SELECT)
    .is("deleted_at", null)
    .order("sort_order")
    .limit(200);

  if (opts?.documentId) query = query.eq("document_id", opts.documentId);
  if (opts?.batchId) query = query.eq("batch_id", opts.batchId);
  return query;
}

export async function providerStatusResumo() {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("gd_signature_providers")
    .select("id, code, name, ativo, config, created_at, updated_at")
    .is("deleted_at", null)
    .order("code");

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://www.ipecc.org.br";

  return {
    configurado:
      ipeccConfigurado() || documentoConfigurado() || govbrConfigurado(),
    provedorPadrao: resolverProviderPadrao(),
    ipecc: {
      configurado: ipeccConfigurado(),
      validacaoBase: `${
        process.env.SIGNATURE_VALIDATION_BASE_URL?.replace(/\/+$/, "") || site
      }/validar`,
    },
    documento: {
      configurado: documentoConfigurado(),
      apiUrl: process.env.DOCUMENTO_API_URL || process.env.DOCUMENSO_API_URL || null,
      webhookUrl: `${site}/api/webhooks/documento`,
    },
    redirectUri: govbrRedirectUriPadrao(),
    env: process.env.GOVBR_SIGNATURE_ENV || "staging",
    govbrConfigurado: govbrConfigurado(),
    providers: (data || []).map((p) => ({
      ...p,
      servidor_pronto:
        p.code === "ipecc"
          ? ipeccConfigurado()
          : p.code === "documento" || p.code === "documenso"
            ? documentoConfigurado()
            : p.code === "govbr"
              ? govbrConfigurado()
              : false,
    })),
  };
}
