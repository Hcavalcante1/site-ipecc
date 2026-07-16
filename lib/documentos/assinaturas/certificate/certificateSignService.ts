import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "@/lib/documentos/types";
import {
  gerarCodigoValidacao,
  sha256Bytes,
} from "@/lib/documentos/signing/evidenceService";
import { CERT_DISCLAIMER, CERT_MAX_BATCH } from "./constants";
import { proibirAssinaturaPorTerceiro } from "../core/permissions";

export type CertPublicMeta = {
  subject: string;
  issuer: string;
  serial: string;
  notBefore: string;
  notAfter: string;
  thumbprintSha256: string;
};

export type CertAppearance = {
  page: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

function batchHashFromDocumentHashes(hashes: string[]): string {
  const canonical = [...hashes].sort().join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

async function appendCertEvent(opts: {
  transactionId: string;
  eventType: string;
  actorUserId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = getSupabaseAdmin();
  await admin.from("gd_cert_events").insert({
    transaction_id: opts.transactionId,
    event_type: opts.eventType,
    actor_user_id: opts.actorUserId || null,
    ip: opts.ip || null,
    user_agent: opts.userAgent || null,
    metadata: opts.metadata || {},
  });
}

async function carregarDocEHash(documentId: string): Promise<
  | {
      ok: true;
      documentId: string;
      versionId: string | null;
      processoId: string | null;
      storagePath: string;
      hash: string;
    }
  | { ok: false; error: string; status?: number }
> {
  const admin = getSupabaseAdmin();
  const { data: doc } = await admin
    .from("gd_documents")
    .select("id, processo_id, storage_path, current_version, mime_type, file_name")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc?.storage_path) {
    return { ok: false, error: "Documento sem arquivo.", status: 400 };
  }

  const { data: version } = await admin
    .from("gd_document_versions")
    .select("id, version_number, storage_path, file_hash")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pathToRead = version?.storage_path || doc.storage_path;
  const { data: file, error: dlErr } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(pathToRead);

  if (dlErr || !file) {
    return {
      ok: false,
      error: "Falha ao ler o PDF original.",
      status: 500,
    };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const hash =
    (version?.file_hash && String(version.file_hash).length === 64
      ? String(version.file_hash).toLowerCase()
      : null) || sha256Bytes(buf);

  return {
    ok: true,
    documentId: doc.id,
    versionId: version?.id || null,
    processoId: doc.processo_id || null,
    storagePath: pathToRead,
    hash,
  };
}

/**
 * Cria sessão unitária ou lote. Sem receber chave privada.
 */
export async function criarSessaoCertificado(opts: {
  documentIds: string[];
  signerUserId: string;
  actorUserId: string;
  processoId?: string | null;
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<
  | {
      ok: true;
      mode: "single" | "batch";
      batchId: string | null;
      batchHashSha256: string | null;
      disclaimer: string;
      items: Array<{
        itemId: string | null;
        transactionId: string;
        documentId: string;
        documentHashSha256: string;
        downloadPath: string;
      }>;
    }
  | { ok: false; error: string; status?: number }
> {
  const third = proibirAssinaturaPorTerceiro({
    level: "CERTIFICATE",
    actorUserId: opts.actorUserId,
    signerUserId: opts.signerUserId,
  });
  if (third.ok === false) {
    return { ok: false, error: third.reason, status: 403 };
  }

  const ids = [
    ...new Set(
      opts.documentIds.map((d) => String(d || "").trim()).filter(Boolean)
    ),
  ];
  if (ids.length < 1) {
    return { ok: false, error: "Informe ao menos um documento.", status: 400 };
  }
  if (ids.length > CERT_MAX_BATCH) {
    return {
      ok: false,
      error: `Limite de ${CERT_MAX_BATCH} documentos por sessão.`,
      status: 400,
    };
  }

  const admin = getSupabaseAdmin();
  const loaded: Array<{
    documentId: string;
    versionId: string | null;
    processoId: string | null;
    storagePath: string;
    hash: string;
  }> = [];

  for (const id of ids) {
    const r = await carregarDocEHash(id);
    if (r.ok === false) return r;
    loaded.push(r);
  }

  const hashes = loaded.map((l) => l.hash);
  const batchHash =
    loaded.length > 1 ? batchHashFromDocumentHashes(hashes) : null;
  const mode = loaded.length > 1 ? "batch" : "single";
  let batchId: string | null = null;

  if (mode === "batch") {
    const { data: batch, error: batchErr } = await admin
      .from("gd_cert_batches")
      .insert({
        processo_id: opts.processoId || loaded[0]?.processoId || null,
        created_by: opts.signerUserId,
        status: "PENDING",
        item_count: loaded.length,
        batch_hash_sha256: batchHash,
      })
      .select("id")
      .single();
    if (batchErr || !batch) {
      return {
        ok: false,
        error: batchErr?.message || "Falha ao criar lote.",
        status: 500,
      };
    }
    batchId = batch.id;
  }

  const items: Array<{
    itemId: string | null;
    transactionId: string;
    documentId: string;
    documentHashSha256: string;
    downloadPath: string;
  }> = [];

  for (let i = 0; i < loaded.length; i++) {
    const doc = loaded[i];
    const { data: tx, error: txErr } = await admin
      .from("gd_cert_transactions")
      .insert({
        processo_id: opts.processoId || doc.processoId,
        document_id: doc.documentId,
        document_version_id: doc.versionId,
        signer_user_id: opts.signerUserId,
        status: "PENDING",
        document_hash_sha256: doc.hash,
        original_storage_path: doc.storagePath,
        batch_id: batchId,
      })
      .select("id")
      .single();

    if (txErr || !tx) {
      return {
        ok: false,
        error: txErr?.message || "Falha ao criar transação.",
        status: 500,
      };
    }

    let itemId: string | null = null;
    if (batchId) {
      const { data: item, error: itemErr } = await admin
        .from("gd_cert_batch_items")
        .insert({
          batch_id: batchId,
          document_id: doc.documentId,
          document_version_id: doc.versionId,
          document_hash_sha256: doc.hash,
          transaction_id: tx.id,
          sort_order: i,
          status: "PENDING",
        })
        .select("id")
        .single();
      if (itemErr || !item) {
        return {
          ok: false,
          error: itemErr?.message || "Falha ao criar item do lote.",
          status: 500,
        };
      }
      itemId = item.id;
    }

    await appendCertEvent({
      transactionId: tx.id,
      eventType: "CREATED",
      actorUserId: opts.actorUserId,
      ip: opts.client?.ip,
      userAgent: opts.client?.userAgent,
      metadata: { batch_id: batchId, document_hash: doc.hash },
    });

    await admin.from("gd_cert_artifacts").insert({
      transaction_id: tx.id,
      artifact_type: "ORIGINAL_DOCUMENT",
      storage_bucket: GD_STORAGE_BUCKET,
      storage_path: doc.storagePath,
      mime_type: "application/pdf",
      size_bytes: 0,
      sha256: doc.hash,
    });

    items.push({
      itemId,
      transactionId: tx.id,
      documentId: doc.documentId,
      documentHashSha256: doc.hash,
      downloadPath: `/api/admin/documentos/${doc.documentId}/arquivo`,
    });
  }

  return {
    ok: true,
    mode,
    batchId,
    batchHashSha256: batchHash,
    disclaimer: CERT_DISCLAIMER,
    items,
  };
}

/**
 * Recebe PDF assinado no cliente + metadados públicos do certificado.
 * Nunca recebe PFX/chave privada.
 */
export async function concluirItemCertificado(opts: {
  transactionId: string;
  signerUserId: string;
  actorUserId: string;
  signedPdfBase64: string;
  pkcs7Base64?: string | null;
  cert: CertPublicMeta;
  appearance?: CertAppearance | null;
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<
  | {
      ok: true;
      validationCode: string;
      finalHashSha256: string;
    }
  | { ok: false; error: string; status?: number }
> {
  const third = proibirAssinaturaPorTerceiro({
    level: "CERTIFICATE",
    actorUserId: opts.actorUserId,
    signerUserId: opts.signerUserId,
  });
  if (third.ok === false) {
    return { ok: false, error: third.reason, status: 403 };
  }

  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_cert_transactions")
    .select("*")
    .eq("id", opts.transactionId)
    .maybeSingle();

  if (!tx) {
    return { ok: false, error: "Transação não encontrada.", status: 404 };
  }
  if (tx.signer_user_id !== opts.signerUserId) {
    return { ok: false, error: "Apenas o signatário.", status: 403 };
  }
  if (tx.status === "COMPLETED") {
    return {
      ok: true,
      validationCode: String(tx.verification_code || ""),
      finalHashSha256: String(tx.final_document_hash_sha256 || ""),
    };
  }
  if (tx.status !== "PENDING" && tx.status !== "PROCESSING") {
    return {
      ok: false,
      error: `Transação em status inválido: ${tx.status}`,
      status: 409,
    };
  }

  let signedBuf: Buffer;
  try {
    signedBuf = Buffer.from(opts.signedPdfBase64, "base64");
  } catch {
    return { ok: false, error: "PDF assinado inválido.", status: 400 };
  }
  if (signedBuf.length < 100) {
    return { ok: false, error: "PDF assinado muito pequeno.", status: 400 };
  }
  if (signedBuf.length > 40 * 1024 * 1024) {
    return { ok: false, error: "PDF assinado excede 40 MB.", status: 400 };
  }

  const finalHash = sha256Bytes(signedBuf);
  if (finalHash === String(tx.document_hash_sha256 || "").toLowerCase()) {
    return {
      ok: false,
      error:
        "O PDF enviado é idêntico ao original. Assine no computador antes de enviar.",
      status: 400,
    };
  }

  const thumb = String(opts.cert.thumbprintSha256 || "")
    .trim()
    .toLowerCase();
  if (!thumb || thumb.length < 32) {
    return {
      ok: false,
      error: "Metadados do certificado incompletos (thumbprint).",
      status: 400,
    };
  }

  const validationCode = gerarCodigoValidacao();
  const signedPath = `assinaturas-certificado/${tx.document_id}/${tx.id}/assinado-${validationCode}.pdf`;
  const now = new Date().toISOString();

  const { error: upErr } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .upload(signedPath, signedBuf, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr) {
    return {
      ok: false,
      error: upErr.message || "Falha ao gravar PDF assinado.",
      status: 500,
    };
  }

  let pkcs7Path: string | null = null;
  let pkcs7Hash: string | null = null;
  if (opts.pkcs7Base64) {
    try {
      const p7 = Buffer.from(opts.pkcs7Base64, "base64");
      if (p7.length > 32) {
        pkcs7Hash = sha256Bytes(p7);
        pkcs7Path = `assinaturas-certificado/${tx.document_id}/${tx.id}/assinatura-${validationCode}.p7s`;
        await admin.storage.from(GD_STORAGE_BUCKET).upload(pkcs7Path, p7, {
          contentType: "application/pkcs7-signature",
          upsert: false,
        });
      }
    } catch {
      /* PKCS#7 opcional */
    }
  }

  const appearance = opts.appearance || null;
  const { error: updErr } = await admin
    .from("gd_cert_transactions")
    .update({
      status: "COMPLETED",
      final_document_hash_sha256: finalHash,
      verification_code: validationCode,
      cert_subject: opts.cert.subject || null,
      cert_issuer: opts.cert.issuer || null,
      cert_serial: opts.cert.serial || null,
      cert_not_before: opts.cert.notBefore || null,
      cert_not_after: opts.cert.notAfter || null,
      cert_thumbprint_sha256: thumb,
      appearance_page: appearance?.page ?? null,
      appearance_x: appearance?.x ?? null,
      appearance_y: appearance?.y ?? null,
      appearance_width: appearance?.width ?? null,
      appearance_height: appearance?.height ?? null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", tx.id);

  if (updErr) {
    return {
      ok: false,
      error: updErr.message || "Falha ao atualizar transação.",
      status: 500,
    };
  }

  await admin.from("gd_cert_artifacts").insert({
    transaction_id: tx.id,
    artifact_type: "SIGNED_CERTIFICATE_DOCUMENT",
    storage_bucket: GD_STORAGE_BUCKET,
    storage_path: signedPath,
    mime_type: "application/pdf",
    size_bytes: signedBuf.length,
    sha256: finalHash,
  });

  if (pkcs7Path && pkcs7Hash) {
    await admin.from("gd_cert_artifacts").insert({
      transaction_id: tx.id,
      artifact_type: "PKCS7_SIGNATURE",
      storage_bucket: GD_STORAGE_BUCKET,
      storage_path: pkcs7Path,
      mime_type: "application/pkcs7-signature",
      size_bytes: 0,
      sha256: pkcs7Hash,
    });
  }

  const evidence = {
    validation_code: validationCode,
    document_id: tx.document_id,
    document_hash_before: tx.document_hash_sha256,
    document_hash_after: finalHash,
    cert: opts.cert,
    appearance,
    disclaimer: CERT_DISCLAIMER,
    completed_at: now,
  };
  const evidenceBytes = Buffer.from(JSON.stringify(evidence, null, 2), "utf8");
  const evidencePath = `assinaturas-certificado/${tx.document_id}/${tx.id}/evidencia-${validationCode}.json`;
  await admin.storage.from(GD_STORAGE_BUCKET).upload(evidencePath, evidenceBytes, {
    contentType: "application/json",
    upsert: false,
  });
  await admin.from("gd_cert_artifacts").insert({
    transaction_id: tx.id,
    artifact_type: "EVIDENCE_JSON",
    storage_bucket: GD_STORAGE_BUCKET,
    storage_path: evidencePath,
    mime_type: "application/json",
    size_bytes: evidenceBytes.length,
    sha256: sha256Bytes(evidenceBytes),
  });

  if (tx.batch_id) {
    await admin
      .from("gd_cert_batch_items")
      .update({ status: "COMPLETED" })
      .eq("transaction_id", tx.id);
  }

  await appendCertEvent({
    transactionId: tx.id,
    eventType: "COMPLETED",
    actorUserId: opts.actorUserId,
    ip: opts.client?.ip,
    userAgent: opts.client?.userAgent,
    metadata: {
      validation_code: validationCode,
      final_hash: finalHash,
      cert_thumbprint: thumb,
    },
  });

  return {
    ok: true,
    validationCode,
    finalHashSha256: finalHash,
  };
}

export async function finalizarLoteCertificado(opts: {
  batchId: string;
  signerUserId: string;
}): Promise<
  | { ok: true; done: number; total: number; falhas: number }
  | { ok: false; error: string; status?: number }
> {
  const admin = getSupabaseAdmin();
  const { data: batch } = await admin
    .from("gd_cert_batches")
    .select("id, created_by, status")
    .eq("id", opts.batchId)
    .maybeSingle();

  if (!batch) {
    return { ok: false, error: "Lote não encontrado.", status: 404 };
  }
  if (batch.created_by !== opts.signerUserId) {
    return { ok: false, error: "Apenas o signatário do lote.", status: 403 };
  }

  const { data: items } = await admin
    .from("gd_cert_batch_items")
    .select("id, status")
    .eq("batch_id", opts.batchId);

  const list = items || [];
  const done = list.filter((i) => i.status === "COMPLETED").length;
  const falhas = list.filter((i) => i.status === "FAILED").length;
  const total = list.length;
  const status =
    done === total && total > 0
      ? "COMPLETED"
      : falhas === total
        ? "FAILED"
        : "PROCESSING";

  await admin
    .from("gd_cert_batches")
    .update({
      status,
      completed_at: status === "COMPLETED" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.batchId);

  return { ok: true, done, total, falhas };
}

export async function listarLotesCertificado(opts: { signerUserId: string }) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_cert_batches")
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

export async function verificarTransacaoCertificado(opts: {
  verificationCode: string;
}) {
  const code = String(opts.verificationCode || "")
    .trim()
    .toUpperCase();
  if (!code) return { found: false as const };

  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_cert_transactions")
    .select("*")
    .eq("verification_code", code)
    .eq("status", "COMPLETED")
    .maybeSingle();

  if (!tx) return { found: false as const };

  const { data: signedArt } = await admin
    .from("gd_cert_artifacts")
    .select("storage_path, sha256")
    .eq("transaction_id", tx.id)
    .eq("artifact_type", "SIGNED_CERTIFICATE_DOCUMENT")
    .maybeSingle();

  let integridadeOk = true;
  let detalhe = "Evidência de assinatura com certificado registrada.";
  if (signedArt?.storage_path && signedArt.sha256) {
    const { data: file } = await admin.storage
      .from(GD_STORAGE_BUCKET)
      .download(signedArt.storage_path);
    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      const h = sha256Bytes(buf);
      if (h !== String(signedArt.sha256).toLowerCase()) {
        integridadeOk = false;
        detalhe = "Hash do PDF assinado diverge do registrado.";
      }
    }
  }

  return {
    found: true as const,
    transaction: tx,
    integridadeOk,
    detalhe,
  };
}
