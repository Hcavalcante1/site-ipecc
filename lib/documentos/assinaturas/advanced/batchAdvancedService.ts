import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ADV_BATCH_CONSENT_TEXT,
  ADV_CONSENT_POLICY_CODE,
  ADV_CONSENT_VERSION,
} from "./constants";
import {
  aceitarConsentimentoAvancado,
  autorizarTransacaoAvancada,
  concluirTransacaoAvancada,
  criarTransacaoAvancada,
  iniciarAutenticacaoAvancada,
} from "./advancedSignService";
import {
  identidadePodeAssinarAvancado,
  obterIdentidadeAvancada,
} from "./identityService";
import { appendAdvEvent } from "./auditService";

function batchHashFromDocumentHashes(hashes: string[]): string {
  const canonical = [...hashes].sort().join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Cria lote avançado: congela cada documento, calcula hashes e hash do conjunto.
 * Lista imutável após criação (itens não podem ser adicionados nesta fase).
 */
export async function criarLoteAvancado(opts: {
  documentIds: string[];
  signerUserId: string;
  actorUserId: string;
  processoId?: string | null;
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<
  | {
      ok: true;
      batchId: string;
      itemCount: number;
      batchHashSha256: string;
      consentText: string;
      items: Array<{
        documentId: string;
        transactionId: string;
        documentHashSha256: string;
      }>;
    }
  | { ok: false; error: string; status?: number }
> {
  if (opts.actorUserId !== opts.signerUserId) {
    return {
      ok: false,
      error: "Na assinatura avançada, apenas o próprio signatário cria o lote.",
      status: 403,
    };
  }

  const ids = [...new Set(opts.documentIds.map((d) => String(d || "").trim()).filter(Boolean))];
  if (ids.length < 1) {
    return { ok: false, error: "Informe ao menos um documento.", status: 400 };
  }
  if (ids.length > 50) {
    return { ok: false, error: "Limite de 50 documentos por lote avançado.", status: 400 };
  }

  const identity = await obterIdentidadeAvancada({
    userId: opts.signerUserId,
    processoId: opts.processoId,
  });
  const gate = identidadePodeAssinarAvancado(identity);
  if (gate.ok === false) {
    return { ok: false, error: gate.reason, status: 403 };
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: batch, error: batchErr } = await admin
    .from("gd_adv_batches")
    .insert({
      processo_id: opts.processoId || null,
      created_by: opts.signerUserId,
      status: "PENDING",
      item_count: ids.length,
      metadata: {
        consent_text_preview: ADV_BATCH_CONSENT_TEXT,
        frozen: true,
      },
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (batchErr || !batch) {
    if (/relation .* does not exist|42P01/i.test(batchErr?.message || "")) {
      return {
        ok: false,
        error:
          "Tabelas de assinatura avançada ausentes. Aplique docs/sql/gestao-documental-assinatura-avancada.sql.",
        status: 503,
      };
    }
    return {
      ok: false,
      error: batchErr?.message || "Falha ao criar lote.",
      status: 500,
    };
  }

  const created: Array<{
    documentId: string;
    transactionId: string;
    documentHashSha256: string;
  }> = [];
  const hashes: string[] = [];

  for (let i = 0; i < ids.length; i++) {
    const documentId = ids[i];
    const tx = await criarTransacaoAvancada({
      documentId,
      signerUserId: opts.signerUserId,
      actorUserId: opts.actorUserId,
      processoId: opts.processoId,
      batchId: batch.id,
      idempotencyKey: `batch:${batch.id}:${documentId}`,
      client: opts.client,
    });

    if (tx.ok === false) {
      await admin
        .from("gd_adv_batches")
        .update({
          status: "FAILED",
          updated_at: new Date().toISOString(),
          metadata: { error: tx.error, failed_document_id: documentId },
        })
        .eq("id", batch.id);
      return { ok: false, error: `Documento ${documentId}: ${tx.error}`, status: tx.status };
    }

    hashes.push(tx.documentHashSha256);
    created.push({
      documentId,
      transactionId: tx.transactionId,
      documentHashSha256: tx.documentHashSha256,
    });

    const { error: itemErr } = await admin.from("gd_adv_batch_items").insert({
      batch_id: batch.id,
      document_id: documentId,
      document_version_id: null,
      document_hash_sha256: tx.documentHashSha256,
      sort_order: i + 1,
      transaction_id: tx.transactionId,
      status: "PENDING",
    });

    if (itemErr) {
      return {
        ok: false,
        error: itemErr.message || "Falha ao registrar item do lote.",
        status: 500,
      };
    }

    await admin
      .from("gd_adv_transactions")
      .update({ batch_id: batch.id })
      .eq("id", tx.transactionId);
  }

  const batchHash = batchHashFromDocumentHashes(hashes);
  await admin
    .from("gd_adv_batches")
    .update({
      batch_hash_sha256: batchHash,
      item_count: created.length,
      status: "PENDING",
      updated_at: new Date().toISOString(),
      metadata: {
        consent_text_preview: ADV_BATCH_CONSENT_TEXT,
        frozen: true,
        document_ids: ids,
      },
    })
    .eq("id", batch.id);

  if (created[0]) {
    await appendAdvEvent({
      transactionId: created[0].transactionId,
      eventType: "DOCUMENT_LOCKED",
      actorUserId: opts.signerUserId,
      metadata: {
        batch_id: batch.id,
        batch_hash_sha256: batchHash,
        item_count: created.length,
      },
      ip: opts.client?.ip,
      userAgent: opts.client?.userAgent,
    });
  }

  return {
    ok: true,
    batchId: batch.id,
    itemCount: created.length,
    batchHashSha256: batchHash,
    consentText: ADV_BATCH_CONSENT_TEXT,
    items: created,
  };
}

export async function aceitarConsentimentoLoteAvancado(opts: {
  batchId: string;
  signerUserId: string;
  consentAccepted: boolean;
  documentViewed: boolean;
  listAcknowledged: boolean;
  sessionId?: string | null;
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<{ ok: true; consentId: string } | { ok: false; error: string; status?: number }> {
  if (!opts.consentAccepted || !opts.documentViewed || !opts.listAcknowledged) {
    return {
      ok: false,
      error:
        "Aceite o consentimento do lote, declare a visualização e a lista completa.",
      status: 400,
    };
  }

  const admin = getSupabaseAdmin();
  const { data: batch } = await admin
    .from("gd_adv_batches")
    .select("id, created_by, status, batch_hash_sha256, item_count")
    .eq("id", opts.batchId)
    .maybeSingle();

  if (!batch) return { ok: false, error: "Lote não encontrado.", status: 404 };
  if (batch.created_by !== opts.signerUserId) {
    return { ok: false, error: "Apenas o signatário do lote pode consentir.", status: 403 };
  }

  const { data: items } = await admin
    .from("gd_adv_batch_items")
    .select("id, transaction_id, document_id, document_hash_sha256, status")
    .eq("batch_id", batch.id)
    .order("sort_order", { ascending: true });

  if (!items?.length) {
    return { ok: false, error: "Lote sem itens.", status: 400 };
  }

  // Impede alteração da lista: hash do conjunto deve bater
  const recomputed = batchHashFromDocumentHashes(
    items.map((i) => i.document_hash_sha256)
  );
  if (batch.batch_hash_sha256 && recomputed !== batch.batch_hash_sha256) {
    return {
      ok: false,
      error: "Hash do lote divergente — lista alterada após congelamento.",
      status: 409,
    };
  }

  let firstConsentId: string | null = null;
  for (const item of items) {
    if (!item.transaction_id) continue;
    const r = await aceitarConsentimentoAvancado({
      transactionId: item.transaction_id,
      signerUserId: opts.signerUserId,
      consentAccepted: true,
      documentViewed: true,
      sessionId: opts.sessionId,
      client: opts.client,
    });
    if (r.ok === false) {
      return { ok: false, error: r.error, status: r.status };
    }
    if (!firstConsentId) firstConsentId = r.consentId;

    await admin
      .from("gd_adv_consents")
      .update({
        consent_text: ADV_BATCH_CONSENT_TEXT,
        policy_code: ADV_CONSENT_POLICY_CODE,
        policy_version: ADV_CONSENT_VERSION,
      })
      .eq("id", r.consentId);
  }

  await admin
    .from("gd_adv_batches")
    .update({
      status: "AWAITING_AUTHENTICATION",
      consent_id: firstConsentId,
      updated_at: new Date().toISOString(),
      metadata: {
        batch_consent: true,
        item_count: batch.item_count,
        batch_hash_sha256: batch.batch_hash_sha256,
      },
    })
    .eq("id", batch.id);

  return { ok: true, consentId: firstConsentId! };
}

export async function iniciarMfaLoteAvancado(opts: {
  batchId: string;
  signerUserId: string;
  actorEmail: string;
  client?: { ip?: string | null; userAgent?: string | null };
}) {
  const admin = getSupabaseAdmin();
  const { data: batch } = await admin
    .from("gd_adv_batches")
    .select("id, created_by, status")
    .eq("id", opts.batchId)
    .maybeSingle();

  if (!batch) return { ok: false as const, error: "Lote não encontrado.", status: 404 };
  if (batch.created_by !== opts.signerUserId) {
    return { ok: false as const, error: "Signatário inválido.", status: 403 };
  }

  const { data: item } = await admin
    .from("gd_adv_batch_items")
    .select("transaction_id")
    .eq("batch_id", batch.id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!item?.transaction_id) {
    return { ok: false as const, error: "Lote sem transação âncora.", status: 400 };
  }

  return iniciarAutenticacaoAvancada({
    transactionId: item.transaction_id,
    signerUserId: opts.signerUserId,
    actorEmail: opts.actorEmail,
    client: opts.client,
  });
}

/**
 * Autoriza com MFA uma vez (transação âncora) e propaga AUTHORIZED aos demais itens.
 */
export async function autorizarLoteAvancado(opts: {
  batchId: string;
  signerUserId: string;
  actorEmail: string;
  password: string;
  otpCode: string;
  challengeId: string;
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const admin = getSupabaseAdmin();
  const { data: batch } = await admin
    .from("gd_adv_batches")
    .select("id, created_by, batch_hash_sha256")
    .eq("id", opts.batchId)
    .maybeSingle();

  if (!batch) return { ok: false, error: "Lote não encontrado.", status: 404 };
  if (batch.created_by !== opts.signerUserId) {
    return { ok: false, error: "Signatário inválido.", status: 403 };
  }

  const { data: items } = await admin
    .from("gd_adv_batch_items")
    .select("id, transaction_id, document_hash_sha256")
    .eq("batch_id", batch.id)
    .order("sort_order", { ascending: true });

  if (!items?.length || !items[0].transaction_id) {
    return { ok: false, error: "Lote sem itens.", status: 400 };
  }

  const recomputed = batchHashFromDocumentHashes(
    items.map((i) => i.document_hash_sha256)
  );
  if (batch.batch_hash_sha256 && recomputed !== batch.batch_hash_sha256) {
    return {
      ok: false,
      error: "Hash do lote divergente na autorização.",
      status: 409,
    };
  }

  const auth = await autorizarTransacaoAvancada({
    transactionId: items[0].transaction_id,
    signerUserId: opts.signerUserId,
    actorEmail: opts.actorEmail,
    password: opts.password,
    otpCode: opts.otpCode,
    challengeId: opts.challengeId,
    allowSessionFallback: true,
    client: opts.client,
  });

  if (auth.ok === false) return auth;

  const now = new Date().toISOString();
  for (const item of items.slice(1)) {
    if (!item.transaction_id) continue;
    await admin
      .from("gd_adv_transactions")
      .update({
        status: "AUTHORIZED",
        authentication_method: auth.authenticationMethod,
        mfa_method: "email_otp",
        authorized_at: now,
        updated_at: now,
        metadata: { batch_auth_propagated: true, batch_id: batch.id },
      })
      .eq("id", item.transaction_id)
      .eq("signer_user_id", opts.signerUserId)
      .in("status", ["AWAITING_AUTHENTICATION", "AUTHORIZED"]);

    await appendAdvEvent({
      transactionId: item.transaction_id,
      eventType: "SIGNATURE_AUTHORIZED",
      actorUserId: opts.signerUserId,
      metadata: { via_batch: batch.id },
    });
  }

  await admin
    .from("gd_adv_batches")
    .update({ status: "AUTHORIZED", updated_at: now })
    .eq("id", batch.id);

  return { ok: true };
}

export async function concluirLoteAvancado(opts: {
  batchId: string;
  signerUserId: string;
  actorName: string;
  cpf: string;
  cargo?: string | null;
  client?: {
    ip?: string | null;
    userAgent?: string | null;
    timezone?: string | null;
  };
}): Promise<
  | {
      ok: true;
      done: number;
      total: number;
      falhas: Array<{ documentId: string; error: string }>;
      resultados: Array<{
        documentId: string;
        transactionId: string;
        verificationCode: string;
      }>;
    }
  | { ok: false; error: string; status?: number }
> {
  const admin = getSupabaseAdmin();
  const { data: batch } = await admin
    .from("gd_adv_batches")
    .select("id, created_by, status, batch_hash_sha256")
    .eq("id", opts.batchId)
    .maybeSingle();

  if (!batch) return { ok: false, error: "Lote não encontrado.", status: 404 };
  if (batch.created_by !== opts.signerUserId) {
    return { ok: false, error: "Signatário inválido.", status: 403 };
  }
  if (batch.status !== "AUTHORIZED" && batch.status !== "PROCESSING") {
    return {
      ok: false,
      error: "Lote precisa estar AUTHORIZED.",
      status: 400,
    };
  }

  const { data: items } = await admin
    .from("gd_adv_batch_items")
    .select("id, document_id, transaction_id, document_hash_sha256, status")
    .eq("batch_id", batch.id)
    .order("sort_order", { ascending: true });

  if (!items?.length) return { ok: false, error: "Lote vazio.", status: 400 };

  const recomputed = batchHashFromDocumentHashes(
    items.map((i) => i.document_hash_sha256)
  );
  if (batch.batch_hash_sha256 && recomputed !== batch.batch_hash_sha256) {
    return {
      ok: false,
      error: "Hash do lote divergente na conclusão.",
      status: 409,
    };
  }

  await admin
    .from("gd_adv_batches")
    .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
    .eq("id", batch.id);

  const falhas: Array<{ documentId: string; error: string }> = [];
  const resultados: Array<{
    documentId: string;
    transactionId: string;
    verificationCode: string;
  }> = [];

  for (const item of items) {
    if (item.status === "COMPLETED") continue;
    if (!item.transaction_id) {
      falhas.push({ documentId: item.document_id, error: "Sem transação." });
      continue;
    }

    await admin
      .from("gd_adv_batch_items")
      .update({ status: "PROCESSING" })
      .eq("id", item.id);

    // Garante AUTHORIZED se propagação atrasou
    await admin
      .from("gd_adv_transactions")
      .update({
        status: "AUTHORIZED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.transaction_id)
      .eq("status", "AWAITING_AUTHENTICATION");

    const r = await concluirTransacaoAvancada({
      transactionId: item.transaction_id,
      signerUserId: opts.signerUserId,
      actorName: opts.actorName,
      cpf: opts.cpf,
      cargo: opts.cargo,
      client: opts.client,
    });

    if (r.ok === false) {
      falhas.push({ documentId: item.document_id, error: r.error });
      await admin
        .from("gd_adv_batch_items")
        .update({ status: "FAILED", error_message: r.error })
        .eq("id", item.id);
      continue;
    }

    resultados.push({
      documentId: item.document_id,
      transactionId: r.transactionId,
      verificationCode: r.verificationCode,
    });
    await admin
      .from("gd_adv_batch_items")
      .update({ status: "COMPLETED", error_message: null })
      .eq("id", item.id);
  }

  const done = resultados.length;
  const total = items.length;
  const finalStatus =
    done === 0 ? "FAILED" : falhas.length > 0 ? "PARTIAL" : "COMPLETED";

  await admin
    .from("gd_adv_batches")
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        done,
        total,
        falhas,
        batch_hash_sha256: batch.batch_hash_sha256,
        report: resultados,
      },
    })
    .eq("id", batch.id);

  return { ok: true, done, total, falhas, resultados };
}

export async function listarLotesAvancados(opts: {
  signerUserId: string;
}) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_adv_batches")
    .select(
      "id, processo_id, status, item_count, batch_hash_sha256, created_at, completed_at, metadata"
    )
    .eq("created_by", opts.signerUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { ok: false as const, error: error.message, batches: [] as never[] };
  }
  return { ok: true as const, batches: data || [] };
}
