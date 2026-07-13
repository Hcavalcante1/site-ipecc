import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "./types";
import { registrarLog } from "./documentsService";
import {
  GovBrProvider,
  govbrConfigurado,
  govbrRedirectUriPadrao,
} from "./signature/GovBrProvider";
import { notificarEventoDocumental } from "./notificationsService";

export const SIG_DOC_SELECT =
  "id, document_id, version_id, provider_id, provider_code, status, external_session_id, signed_storage_path, signed_hash, error_message, created_by, created_at, updated_at, deleted_at";

export const BATCH_SELECT =
  "id, processo_id, title, provider_code, status, progress_done, progress_total, error_message, created_by, created_at, updated_at, deleted_at";

export const SIGNER_SELECT =
  "id, signature_document_id, batch_id, document_id, name, email, cpf, user_id, mode, required, sort_order, deadline_at, status, signed_at, rejection_reason, created_by, created_at, updated_at, deleted_at";

export const BATCH_ITEM_SELECT =
  "id, batch_id, document_id, signature_document_id, status, error_message, sort_order, created_by, created_at, updated_at, deleted_at";

function tabelaAusente(message?: string, code?: string) {
  return (
    code === "42P01" ||
    /relation .* does not exist|could not find the table/i.test(message || "")
  );
}

export { tabelaAusente as tabelaAssinaturaAusente, govbrConfigurado };

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

  if (opts?.processoIds && opts.processoIds !== "todos") {
    const docIds = [...new Set((data || []).map((r) => r.document_id))];
    if (docIds.length === 0) return { data: [], error: null };
    const docs = await admin
      .from("gd_documents")
      .select("id, processo_id")
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
    return {
      data: (data || []).filter((r) => allowed.has(r.document_id)),
      error: null,
    };
  }

  return { data: data || [], error: null };
}

export async function criarAssinaturaDocumento(opts: {
  documentId: string;
  versionId?: string | null;
  userId: string;
  actorEmail?: string | null;
  processoId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const admin = getSupabaseAdmin();
  const provider = await admin
    .from("gd_signature_providers")
    .select("id")
    .eq("code", "govbr")
    .maybeSingle();

  const { data, error } = await admin
    .from("gd_signature_documents")
    .insert({
      document_id: opts.documentId,
      version_id: opts.versionId || null,
      provider_id: provider.data?.id || null,
      provider_code: "govbr",
      status: "pending",
      created_by: opts.userId,
    })
    .select(SIG_DOC_SELECT)
    .single();

  if (!error && data) {
    await registrarLog({
      processo_id: opts.processoId,
      document_id: opts.documentId,
      action: "assinatura_criada",
      detail: { signature_document_id: data.id },
      actor_id: opts.userId,
      actor_email: opts.actorEmail,
      ip: opts.ip,
      user_agent: opts.userAgent,
    });
    await notificarEventoDocumental({
      event_type: "assinatura_criada",
      title: "Pedido de assinatura criado",
      body: "Um documento foi encaminhado para assinatura digital.",
      document_id: opts.documentId,
      processo_id: opts.processoId,
      user_id: opts.userId,
      link_path: `/admin/documentos/assinaturas`,
      created_by: opts.userId,
    });
  }

  return { data, error };
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
  const scopes = [scope, "govbr"];
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
    const { createHash } = await import("crypto");
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

  return {
    configurado: govbrConfigurado(),
    redirectUri: govbrRedirectUriPadrao(),
    env: process.env.GOVBR_SIGNATURE_ENV || "staging",
    providers: (data || []).map((p) => ({
      ...p,
      servidor_pronto: p.code === "govbr" ? govbrConfigurado() : false,
    })),
  };
}
