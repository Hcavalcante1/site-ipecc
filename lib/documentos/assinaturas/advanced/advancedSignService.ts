import { createHash, randomBytes, randomInt } from "crypto";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "@/lib/documentos/types";
import { confirmarSenhaUsuario } from "@/lib/documentos/signing/passwordConfirm";
import { carimbarPdfAssinatura } from "@/lib/documentos/signing/pdfStampService";
import { sha256Bytes as sha256Simple } from "@/lib/documentos/signing/evidenceService";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  ADV_CHALLENGE_TTL_MS,
  ADV_CONSENT_POLICY_CODE,
  ADV_CONSENT_TEXT,
  ADV_CONSENT_VERSION,
  ADV_STORAGE_PREFIX,
} from "./constants";
import { appendAdvEvent, auditChainHash } from "./auditService";
import {
  identidadePodeAssinarAvancado,
  obterIdentidadeAvancada,
} from "./identityService";
import {
  canonicalJson,
  loadSystemSigningKey,
  sealManifest,
  sha256Hex,
  verifyManifestSeal,
} from "../shared/crypto";
import { gerarCodigoValidacao } from "@/lib/documentos/signing/evidenceService";
import { validationBaseUrl } from "@/lib/documentos/signing/constants";

const TX_SELECT =
  "id, processo_id, document_id, document_version_id, signature_level, signer_user_id, status, document_hash_sha256, final_document_hash_sha256, document_size_bytes, document_mime_type, identity_verification_id, identity_level, consent_id, authentication_method, mfa_method, verification_code, system_key_version_id, batch_id, original_storage_path, locked_at, authorized_at, completed_at, cancelled_at, expired_at, revoked_at, idempotency_key, created_at, updated_at, metadata";

function hashNonce(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function resolverFrom(): string {
  const raw =
    String(process.env.RESEND_FROM || "").trim() ||
    String(process.env.EMAIL_FROM || "").trim() ||
    "IPECC <onboarding@resend.dev>";
  if (/<[^>]+>/.test(raw)) return raw;
  if (raw.includes("@")) return `IPECC <${raw}>`;
  return "IPECC <onboarding@resend.dev>";
}

async function enviarOtpAvancado(to: string, code: string) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    return { ok: false as const, error: "RESEND_API_KEY ausente." };
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: resolverFrom(),
      to,
      subject: "[IPECC] Código MFA — Assinatura avançada",
      text: [
        "Confirmação MFA para Assinatura Eletrônica Avançada IPECC.",
        "",
        `Código: ${code}`,
        "",
        "Validade: 5 minutos. Se não foi você, ignore este e-mail.",
      ].join("\n"),
    });
    if (error) {
      return {
        ok: false as const,
        error:
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao enviar OTP.",
      };
    }
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Falha ao enviar OTP.",
    };
  }
}

async function ensureSystemKeyRow(): Promise<
  | { ok: true; keyVersionId: string; privateKeyPem: string; versionLabel: string }
  | { ok: false; error: string }
> {
  const loaded = loadSystemSigningKey();
  if (!loaded) {
    return {
      ok: false,
      error:
        "Chave do sistema ausente. Defina SIGNATURE_ADV_PRIVATE_KEY_PEM (e opcionalmente SIGNATURE_ADV_PUBLIC_KEY_PEM / SIGNATURE_ADV_KEY_VERSION).",
    };
  }
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("gd_adv_key_versions")
    .select("id, version_label")
    .eq("version_label", loaded.versionLabel)
    .maybeSingle();

  if (existing?.id) {
    return {
      ok: true,
      keyVersionId: existing.id,
      privateKeyPem: loaded.privateKeyPem,
      versionLabel: loaded.versionLabel,
    };
  }

  await admin
    .from("gd_adv_key_versions")
    .update({ active: false, retired_at: new Date().toISOString() })
    .eq("active", true);

  const { data: inserted, error } = await admin
    .from("gd_adv_key_versions")
    .insert({
      version_label: loaded.versionLabel,
      algorithm: "Ed25519",
      public_key_pem: loaded.publicKeyPem,
      active: true,
    })
    .select("id, version_label")
    .single();

  if (error || !inserted) {
    return {
      ok: false,
      error: error?.message || "Falha ao registrar versão de chave.",
    };
  }
  return {
    ok: true,
    keyVersionId: inserted.id,
    privateKeyPem: loaded.privateKeyPem,
    versionLabel: loaded.versionLabel,
  };
}

export async function criarTransacaoAvancada(opts: {
  documentId: string;
  signerUserId: string;
  actorUserId: string;
  processoId?: string | null;
  batchId?: string | null;
  idempotencyKey?: string | null;
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<
  | {
      ok: true;
      transactionId: string;
      documentHashSha256: string;
      consentText: string;
      status: string;
    }
  | { ok: false; error: string; status?: number }
> {
  if (opts.actorUserId !== opts.signerUserId) {
    return {
      ok: false,
      error:
        "Na assinatura avançada, apenas o próprio signatário pode iniciar a operação.",
      status: 403,
    };
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

  if (opts.idempotencyKey) {
    const { data: existing } = await admin
      .from("gd_adv_transactions")
      .select(TX_SELECT)
      .eq("signer_user_id", opts.signerUserId)
      .eq("idempotency_key", opts.idempotencyKey)
      .maybeSingle();
    if (existing) {
      return {
        ok: true,
        transactionId: existing.id,
        documentHashSha256: existing.document_hash_sha256,
        consentText: ADV_CONSENT_TEXT,
        status: existing.status,
      };
    }
  }

  const { data: doc } = await admin
    .from("gd_documents")
    .select("id, processo_id, storage_path, current_version, mime_type, file_name")
    .eq("id", opts.documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!doc?.storage_path) {
    return { ok: false, error: "Documento sem arquivo.", status: 400 };
  }

  const { data: version } = await admin
    .from("gd_document_versions")
    .select("id, version_number, storage_path, file_hash")
    .eq("document_id", doc.id)
    .eq("version_number", doc.current_version || 1)
    .maybeSingle();

  if (!version?.id) {
    return {
      ok: false,
      error: "Versão documental não encontrada para congelar.",
      status: 400,
    };
  }

  const pathToRead = version.storage_path || doc.storage_path;
  const { data: blob, error: dlErr } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(pathToRead);

  if (dlErr || !blob) {
    return {
      ok: false,
      error: dlErr?.message || "Falha ao baixar PDF.",
      status: 500,
    };
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  const documentHash = sha256Simple(buf);
  const now = new Date();
  const frozenPath = `${ADV_STORAGE_PREFIX}/${opts.processoId || doc.processo_id || "geral"}/${doc.id}/${now.getTime()}-original.pdf`;

  const { error: upErr } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .upload(frozenPath, buf, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (upErr) {
    return {
      ok: false,
      error: upErr.message || "Falha ao preservar original congelado.",
      status: 500,
    };
  }

  const { data: tx, error } = await admin
    .from("gd_adv_transactions")
    .insert({
      processo_id: opts.processoId || doc.processo_id || null,
      document_id: doc.id,
      document_version_id: version.id,
      signature_level: "ADVANCED",
      signer_user_id: opts.signerUserId,
      status: "AWAITING_SIGNER",
      document_hash_sha256: documentHash,
      document_size_bytes: buf.byteLength,
      document_mime_type: doc.mime_type || "application/pdf",
      identity_verification_id: gate.row.id,
      identity_level: gate.row.identity_level,
      original_storage_path: frozenPath,
      locked_at: now.toISOString(),
      batch_id: opts.batchId || null,
      idempotency_key: opts.idempotencyKey || null,
      metadata: { file_name: doc.file_name || null },
    })
    .select(TX_SELECT)
    .single();

  if (error || !tx) {
    if (/relation .* does not exist|42P01/i.test(error?.message || "")) {
      return {
        ok: false,
        error:
          "Tabelas de assinatura avançada ausentes. Aplique docs/sql/gestao-documental-assinatura-avancada.sql.",
        status: 503,
      };
    }
    return {
      ok: false,
      error: error?.message || "Falha ao criar transação.",
      status: 500,
    };
  }

  await admin.from("gd_adv_artifacts").insert({
    transaction_id: tx.id,
    artifact_type: "ORIGINAL_DOCUMENT",
    storage_bucket: GD_STORAGE_BUCKET,
    storage_path: frozenPath,
    mime_type: "application/pdf",
    size_bytes: buf.byteLength,
    sha256: documentHash,
  });

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "DOCUMENT_SELECTED",
    actorUserId: opts.signerUserId,
    ip: opts.client?.ip,
    userAgent: opts.client?.userAgent,
    metadata: { document_id: doc.id, version_id: version.id },
  });
  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "DOCUMENT_HASHED",
    actorUserId: opts.signerUserId,
    metadata: { document_hash_sha256: documentHash },
  });
  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "DOCUMENT_LOCKED",
    actorUserId: opts.signerUserId,
    metadata: { original_storage_path: frozenPath },
  });
  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "CONSENT_PRESENTED",
    actorUserId: opts.signerUserId,
    metadata: {
      policy_code: ADV_CONSENT_POLICY_CODE,
      policy_version: ADV_CONSENT_VERSION,
    },
  });

  return {
    ok: true,
    transactionId: tx.id,
    documentHashSha256: documentHash,
    consentText: ADV_CONSENT_TEXT,
    status: tx.status,
  };
}

export async function aceitarConsentimentoAvancado(opts: {
  transactionId: string;
  signerUserId: string;
  consentAccepted: boolean;
  documentViewed: boolean;
  sessionId?: string | null;
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<{ ok: true; consentId: string } | { ok: false; error: string; status?: number }> {
  if (!opts.consentAccepted) {
    return {
      ok: false,
      error: "É obrigatório aceitar o consentimento expresso.",
      status: 400,
    };
  }
  if (!opts.documentViewed) {
    return {
      ok: false,
      error: "É obrigatório declarar que visualizou o documento.",
      status: 400,
    };
  }

  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_adv_transactions")
    .select(TX_SELECT)
    .eq("id", opts.transactionId)
    .maybeSingle();

  if (!tx) return { ok: false, error: "Transação não encontrada.", status: 404 };
  if (tx.signer_user_id !== opts.signerUserId) {
    return { ok: false, error: "Signatário inválido para esta transação.", status: 403 };
  }
  if (["COMPLETED", "CANCELLED", "REVOKED", "EXPIRED", "FAILED"].includes(tx.status)) {
    return { ok: false, error: `Transação em estado ${tx.status}.`, status: 400 };
  }

  const now = new Date().toISOString();
  const { data: consent, error } = await admin
    .from("gd_adv_consents")
    .insert({
      transaction_id: tx.id,
      policy_code: ADV_CONSENT_POLICY_CODE,
      policy_version: ADV_CONSENT_VERSION,
      locale: "pt-BR",
      consent_text: ADV_CONSENT_TEXT,
      document_id: tx.document_id,
      document_version_id: tx.document_version_id,
      document_hash_sha256: tx.document_hash_sha256,
      signer_user_id: opts.signerUserId,
      processo_id: tx.processo_id,
      accepted: true,
      accepted_at: now,
      session_id: opts.sessionId || null,
      ip: opts.client?.ip || null,
      user_agent: opts.client?.userAgent || null,
      authentication_method: null,
    })
    .select("id")
    .single();

  if (error || !consent) {
    return {
      ok: false,
      error: error?.message || "Falha ao registrar consentimento.",
      status: 500,
    };
  }

  await admin
    .from("gd_adv_transactions")
    .update({
      consent_id: consent.id,
      status: "AWAITING_AUTHENTICATION",
      updated_at: now,
    })
    .eq("id", tx.id)
    .neq("status", "COMPLETED");

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "DOCUMENT_VIEWED",
    actorUserId: opts.signerUserId,
    sessionId: opts.sessionId,
    ip: opts.client?.ip,
    userAgent: opts.client?.userAgent,
  });
  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "CONSENT_ACCEPTED",
    actorUserId: opts.signerUserId,
    metadata: { consent_id: consent.id },
    ip: opts.client?.ip,
    userAgent: opts.client?.userAgent,
  });

  return { ok: true, consentId: consent.id };
}

export async function iniciarAutenticacaoAvancada(opts: {
  transactionId: string;
  signerUserId: string;
  actorEmail: string;
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<
  | {
      ok: true;
      challengeId: string;
      expiresAt: string;
      devCode?: string;
      emailWarning?: string;
    }
  | { ok: false; error: string; status?: number }
> {
  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_adv_transactions")
    .select(TX_SELECT)
    .eq("id", opts.transactionId)
    .maybeSingle();

  if (!tx) return { ok: false, error: "Transação não encontrada.", status: 404 };
  if (tx.signer_user_id !== opts.signerUserId) {
    return { ok: false, error: "Signatário inválido.", status: 403 };
  }
  if (!tx.consent_id) {
    return { ok: false, error: "Consentimento ainda não aceito.", status: 400 };
  }
  if (tx.status !== "AWAITING_AUTHENTICATION" && tx.status !== "AUTHORIZED") {
    return {
      ok: false,
      error: "Transação não está aguardando autenticação.",
      status: 400,
    };
  }

  const nonce = randomBytes(32).toString("hex");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + ADV_CHALLENGE_TTL_MS).toISOString();

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "REAUTHENTICATION_STARTED",
    actorUserId: opts.signerUserId,
    ip: opts.client?.ip,
    userAgent: opts.client?.userAgent,
  });
  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "MFA_CHALLENGE_CREATED",
    actorUserId: opts.signerUserId,
    metadata: { challenge_type: "COMPOSITE" },
  });

  const { data: challenge, error } = await admin
    .from("gd_adv_auth_challenges")
    .insert({
      transaction_id: tx.id,
      signer_user_id: opts.signerUserId,
      challenge_type: "COMPOSITE",
      nonce_hash: hashNonce(nonce),
      code_hash: hashNonce(code),
      status: "PENDING",
      expires_at: expiresAt,
      document_hash_sha256: tx.document_hash_sha256,
      consent_id: tx.consent_id,
      ip: opts.client?.ip || null,
      user_agent: opts.client?.userAgent || null,
      metadata: { nonce_client_hint: nonce.slice(0, 8) },
    })
    .select("id")
    .single();

  if (error || !challenge) {
    return {
      ok: false,
      error: error?.message || "Falha ao criar desafio.",
      status: 500,
    };
  }

  const mail = await enviarOtpAvancado(opts.actorEmail, code);
  const allowPanel =
    String(process.env.SIGNATURE_OTP_ALLOW_PANEL_FALLBACK || "")
      .trim()
      .toLowerCase() === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.VERCEL_ENV !== "production");

  if (!mail.ok && !allowPanel) {
    await admin
      .from("gd_adv_auth_challenges")
      .update({ status: "FAILED" })
      .eq("id", challenge.id);
    return {
      ok: false,
      error:
        "Falha ao enviar MFA por e-mail. Configure Resend ou SIGNATURE_OTP_ALLOW_PANEL_FALLBACK=true.",
      status: 503,
    };
  }

  return {
    ok: true,
    challengeId: challenge.id,
    expiresAt,
    ...(mail.ok
      ? {}
      : {
          devCode: code,
          emailWarning: mail.error || "OTP exibido no painel (contingência).",
        }),
  };
}

export async function autorizarTransacaoAvancada(opts: {
  transactionId: string;
  signerUserId: string;
  actorEmail: string;
  password: string;
  otpCode: string;
  challengeId: string;
  client?: { ip?: string | null; userAgent?: string | null };
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_adv_transactions")
    .select(TX_SELECT)
    .eq("id", opts.transactionId)
    .maybeSingle();

  if (!tx) return { ok: false, error: "Transação não encontrada.", status: 404 };
  if (tx.signer_user_id !== opts.signerUserId) {
    return { ok: false, error: "Signatário inválido.", status: 403 };
  }

  const senha = await confirmarSenhaUsuario({
    email: opts.actorEmail,
    password: opts.password,
  });
  if (senha.ok === false) {
    await appendAdvEvent({
      transactionId: tx.id,
      eventType: "REAUTHENTICATION_FAILED",
      actorUserId: opts.signerUserId,
    });
    return { ok: false, error: senha.error, status: 401 };
  }

  const { data: challenge } = await admin
    .from("gd_adv_auth_challenges")
    .select(
      "id, status, expires_at, attempts, max_attempts, code_hash, signer_user_id, document_hash_sha256, consent_id"
    )
    .eq("id", opts.challengeId)
    .eq("transaction_id", tx.id)
    .maybeSingle();

  if (!challenge) {
    return { ok: false, error: "Desafio não encontrado.", status: 404 };
  }
  if (challenge.signer_user_id !== opts.signerUserId) {
    return { ok: false, error: "Desafio de outro signatário.", status: 403 };
  }
  if (challenge.status !== "PENDING") {
    return { ok: false, error: "Desafio já utilizado ou inválido.", status: 400 };
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    await admin
      .from("gd_adv_auth_challenges")
      .update({ status: "EXPIRED" })
      .eq("id", challenge.id);
    return { ok: false, error: "Desafio expirado.", status: 400 };
  }
  if (challenge.document_hash_sha256 !== tx.document_hash_sha256) {
    return { ok: false, error: "Hash do documento divergente do desafio.", status: 400 };
  }
  if (challenge.consent_id !== tx.consent_id) {
    return { ok: false, error: "Consentimento divergente do desafio.", status: 400 };
  }

  const attempts = (challenge.attempts || 0) + 1;
  if (hashNonce(String(opts.otpCode || "").trim()) !== challenge.code_hash) {
    await admin
      .from("gd_adv_auth_challenges")
      .update({
        attempts,
        status: attempts >= (challenge.max_attempts || 5) ? "FAILED" : "PENDING",
      })
      .eq("id", challenge.id)
      .eq("status", "PENDING");
    await appendAdvEvent({
      transactionId: tx.id,
      eventType: "MFA_FAILED",
      actorUserId: opts.signerUserId,
    });
    return { ok: false, error: "Código MFA inválido.", status: 401 };
  }

  const { data: consumed } = await admin
    .from("gd_adv_auth_challenges")
    .update({
      status: "CONSUMED",
      consumed_at: new Date().toISOString(),
      attempts,
    })
    .eq("id", challenge.id)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();

  if (!consumed) {
    return { ok: false, error: "Desafio já consumido (replay).", status: 409 };
  }

  const now = new Date().toISOString();
  await admin
    .from("gd_adv_transactions")
    .update({
      status: "AUTHORIZED",
      authentication_method: "password",
      mfa_method: "email_otp",
      authorized_at: now,
      updated_at: now,
    })
    .eq("id", tx.id);

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "REAUTHENTICATION_SUCCESS",
    actorUserId: opts.signerUserId,
    ip: opts.client?.ip,
    userAgent: opts.client?.userAgent,
  });
  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "MFA_SUCCESS",
    actorUserId: opts.signerUserId,
  });
  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "SIGNATURE_AUTHORIZED",
    actorUserId: opts.signerUserId,
  });

  return { ok: true };
}

async function gerarCertificadoEvidenciasPdf(opts: {
  tx: Record<string, unknown>;
  identityName: string;
  identityLevel: string;
  cpfLast4: string | null;
  manifestCanonical: string;
  signatureBase64: string;
  keyVersion: string;
  auditHash: string | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  const lines = [
    ["Certificado de Evidências — IPECC", true],
    ["Assinatura eletrônica AVANÇADA (não é ICP-Brasil)", false],
    ["", false],
    [`Transação: ${opts.tx.id}`, false],
    [`Documento: ${opts.tx.document_id}`, false],
    [`Hash original: ${opts.tx.document_hash_sha256}`, false],
    [`Hash final: ${opts.tx.final_document_hash_sha256 || "—"}`, false],
    [`Código: ${opts.tx.verification_code}`, false],
    ["", false],
    [`Signatário: ${opts.identityName}`, false],
    [`CPF (últimos 4): ***-**${opts.cpfLast4 || "****"}`, false],
    [`Nível de identidade: ${opts.identityLevel}`, false],
    [`Auth: ${opts.tx.authentication_method} + MFA ${opts.tx.mfa_method}`, false],
    ["", false],
    [`Chave sistema: ${opts.keyVersion} (Ed25519)`, false],
    [`Cadeia auditoria: ${opts.auditHash || "—"}`, false],
    ["", false],
    ["Manifesto (resumo SHA-256):", false],
    [sha256Hex(opts.manifestCanonical), false],
    ["Assinatura do manifesto (Base64, truncada):", false],
    [opts.signatureBase64.slice(0, 80) + "…", false],
    ["", false],
    [`Verificar: ${validationBaseUrl()}/validar/${opts.tx.verification_code}`, false],
  ] as [string, boolean][];

  for (const [text, isBold] of lines) {
    page.drawText(text.slice(0, 95), {
      x: 40,
      y,
      size: isBold ? 14 : 9,
      font: isBold ? bold : font,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= isBold ? 22 : 14;
  }
  return pdf.save();
}

export async function concluirTransacaoAvancada(opts: {
  transactionId: string;
  signerUserId: string;
  actorName: string;
  cpf: string;
  cargo?: string | null;
  placement?: Parameters<typeof carimbarPdfAssinatura>[0]["placement"];
  client?: {
    ip?: string | null;
    userAgent?: string | null;
    timezone?: string | null;
  };
}): Promise<
  | {
      ok: true;
      verificationCode: string;
      signedHash: string;
      transactionId: string;
    }
  | { ok: false; error: string; status?: number }
> {
  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_adv_transactions")
    .select(TX_SELECT)
    .eq("id", opts.transactionId)
    .maybeSingle();

  if (!tx) return { ok: false, error: "Transação não encontrada.", status: 404 };
  if (tx.signer_user_id !== opts.signerUserId) {
    return { ok: false, error: "Signatário inválido.", status: 403 };
  }
  if (tx.status !== "AUTHORIZED") {
    return {
      ok: false,
      error: "Transação precisa estar AUTHORIZED antes de concluir.",
      status: 400,
    };
  }

  const identity = await obterIdentidadeAvancada({
    userId: opts.signerUserId,
    processoId: tx.processo_id,
  });
  const gate = identidadePodeAssinarAvancado(identity);
  if (gate.ok === false) return { ok: false, error: gate.reason, status: 403 };

  const key = await ensureSystemKeyRow();
  if (key.ok === false) return { ok: false, error: key.error, status: 503 };

  const { data: origBlob, error: dlErr } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(tx.original_storage_path);

  if (dlErr || !origBlob) {
    return {
      ok: false,
      error: "Original congelado indisponível.",
      status: 500,
    };
  }

  const originalBuf = Buffer.from(await origBlob.arrayBuffer());
  const checkHash = sha256Simple(originalBuf);
  if (checkHash !== tx.document_hash_sha256) {
    await appendAdvEvent({
      transactionId: tx.id,
      eventType: "VERIFICATION_FAILED",
      actorUserId: opts.signerUserId,
      metadata: { reason: "ARQUIVO_ALTERADO" },
    });
    await admin
      .from("gd_adv_transactions")
      .update({ status: "FAILED", updated_at: new Date().toISOString() })
      .eq("id", tx.id);
    return {
      ok: false,
      error: "ARQUIVO ALTERADO — assinatura inválida (hash diverge).",
      status: 409,
    };
  }

  await admin
    .from("gd_adv_transactions")
    .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
    .eq("id", tx.id)
    .eq("status", "AUTHORIZED");

  const validationCode = gerarCodigoValidacao();
  const signedAt = new Date();
  const timezone = opts.client?.timezone || "America/Sao_Paulo";

  let stamped: Uint8Array;
  try {
    stamped = await carimbarPdfAssinatura({
      pdfBytes: originalBuf,
      nome: opts.actorName,
      cpf: opts.cpf,
      cargo: opts.cargo || gate.row.cargo,
      email: gate.row.email,
      signedAt,
      timezone,
      signatureSerial: 1,
      validationCode,
      placement: opts.placement,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao carimbar PDF.",
      status: 500,
    };
  }

  const finalHash = sha256Simple(Buffer.from(stamped));
  const basePath = `${ADV_STORAGE_PREFIX}/${tx.processo_id || "geral"}/${tx.document_id}/${tx.id}`;
  const signedPath = `${basePath}/signed.pdf`;

  const { error: upSigned } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .upload(signedPath, stamped, { contentType: "application/pdf", upsert: false });
  if (upSigned) {
    return { ok: false, error: upSigned.message, status: 500 };
  }

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "SIGNED_DOCUMENT_GENERATED",
    actorUserId: opts.signerUserId,
  });
  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "FINAL_HASH_CALCULATED",
    actorUserId: opts.signerUserId,
    metadata: { final_document_hash_sha256: finalHash },
  });

  const chainHash = await auditChainHash(tx.id);
  const manifest = {
    schema_version: "1.0",
    signature_level: "ADVANCED",
    transaction_id: tx.id,
    organization_id: tx.processo_id || null,
    document_id: tx.document_id,
    document_version_id: tx.document_version_id,
    document_hash_sha256: tx.document_hash_sha256,
    final_document_hash_sha256: finalHash,
    document_size_bytes: tx.document_size_bytes,
    document_mime_type: tx.document_mime_type,
    signer_id: tx.signer_user_id,
    signer_identity_verification_id: gate.row.id,
    identity_level: gate.row.identity_level,
    consent_version: ADV_CONSENT_VERSION,
    authentication_method: tx.authentication_method || "password",
    mfa_method: tx.mfa_method || "email_otp",
    authenticated_at: tx.authorized_at,
    authorized_at: tx.authorized_at,
    completed_at: signedAt.toISOString(),
    audit_chain_hash: chainHash,
    system_key_version: key.versionLabel,
    verification_code: validationCode,
  };

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "MANIFEST_CREATED",
    actorUserId: opts.signerUserId,
  });

  const sealed = sealManifest(manifest, key.privateKeyPem);
  const sealedEnvelope = {
    manifest,
    payload_canonical: sealed.payloadCanonical,
    signature_base64: sealed.signatureBase64,
    algorithm: "Ed25519",
    system_key_version: key.versionLabel,
  };

  const manifestBytes = Buffer.from(canonicalJson(sealedEnvelope), "utf8");
  const manifestPath = `${basePath}/signed-manifest.json`;
  await admin.storage.from(GD_STORAGE_BUCKET).upload(manifestPath, manifestBytes, {
    contentType: "application/json",
    upsert: false,
  });

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "MANIFEST_SEALED",
    actorUserId: opts.signerUserId,
    metadata: { system_key_version: key.versionLabel },
  });

  const evidenceJson = {
    ...sealedEnvelope,
    signer: {
      name: opts.actorName,
      email: gate.row.email,
      cpf_last4: gate.row.cpf_last4,
      cargo: opts.cargo || gate.row.cargo,
      identity_level: gate.row.identity_level,
    },
    disclaimer:
      "Assinatura eletrônica avançada IPECC. Não equivale a assinatura qualificada ICP-Brasil.",
  };
  const evidenceBytes = Buffer.from(canonicalJson(evidenceJson), "utf8");
  const evidencePath = `${basePath}/evidence.json`;
  await admin.storage.from(GD_STORAGE_BUCKET).upload(evidencePath, evidenceBytes, {
    contentType: "application/json",
    upsert: false,
  });

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "EVIDENCE_JSON_GENERATED",
    actorUserId: opts.signerUserId,
  });

  const certPdf = await gerarCertificadoEvidenciasPdf({
    tx: { ...tx, final_document_hash_sha256: finalHash, verification_code: validationCode },
    identityName: opts.actorName,
    identityLevel: gate.row.identity_level,
    cpfLast4: gate.row.cpf_last4,
    manifestCanonical: sealed.payloadCanonical,
    signatureBase64: sealed.signatureBase64,
    keyVersion: key.versionLabel,
    auditHash: chainHash,
  });
  const certPath = `${basePath}/evidence-certificate.pdf`;
  await admin.storage.from(GD_STORAGE_BUCKET).upload(certPath, certPdf, {
    contentType: "application/pdf",
    upsert: false,
  });

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "EVIDENCE_CERTIFICATE_GENERATED",
    actorUserId: opts.signerUserId,
  });

  const artifacts = [
    {
      artifact_type: "SIGNED_ADVANCED_DOCUMENT",
      storage_path: signedPath,
      mime_type: "application/pdf",
      size_bytes: stamped.byteLength,
      sha256: finalHash,
    },
    {
      artifact_type: "SIGNED_MANIFEST",
      storage_path: manifestPath,
      mime_type: "application/json",
      size_bytes: manifestBytes.byteLength,
      sha256: sha256Simple(manifestBytes),
    },
    {
      artifact_type: "EVIDENCE_JSON",
      storage_path: evidencePath,
      mime_type: "application/json",
      size_bytes: evidenceBytes.byteLength,
      sha256: sha256Simple(evidenceBytes),
    },
    {
      artifact_type: "EVIDENCE_CERTIFICATE",
      storage_path: certPath,
      mime_type: "application/pdf",
      size_bytes: certPdf.byteLength,
      sha256: sha256Simple(Buffer.from(certPdf)),
    },
  ];

  for (const a of artifacts) {
    await admin.from("gd_adv_artifacts").insert({
      transaction_id: tx.id,
      storage_bucket: GD_STORAGE_BUCKET,
      ...a,
    });
  }

  const completedAt = signedAt.toISOString();
  const { data: done } = await admin
    .from("gd_adv_transactions")
    .update({
      status: "COMPLETED",
      final_document_hash_sha256: finalHash,
      verification_code: validationCode,
      system_key_version_id: key.keyVersionId,
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq("id", tx.id)
    .eq("status", "PROCESSING")
    .select("id")
    .maybeSingle();

  if (!done) {
    return {
      ok: false,
      error: "Falha ao concluir (estado concorrente).",
      status: 409,
    };
  }

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "SIGNATURE_COMPLETED",
    actorUserId: opts.signerUserId,
    metadata: { verification_code: validationCode },
    ip: opts.client?.ip,
    userAgent: opts.client?.userAgent,
  });

  return {
    ok: true,
    verificationCode: validationCode,
    signedHash: finalHash,
    transactionId: tx.id,
  };
}

export async function verificarTransacaoAvancada(opts: {
  verificationCode: string;
  uploadedPdfSha256?: string;
}): Promise<{
  found: boolean;
  status:
    | "VALID"
    | "INVALID"
    | "REVOKED"
    | "CANCELLED"
    | "EXPIRED"
    | "FILE_TAMPERED"
    | "EVIDENCE_TAMPERED"
    | "NOT_FOUND";
  level?: "ADVANCED";
  detail?: string;
  transaction?: Record<string, unknown>;
}> {
  const code = String(opts.verificationCode || "").trim().toUpperCase();
  const admin = getSupabaseAdmin();
  const { data: tx } = await admin
    .from("gd_adv_transactions")
    .select(TX_SELECT)
    .eq("verification_code", code)
    .maybeSingle();

  if (!tx) {
    return { found: false, status: "NOT_FOUND" };
  }

  if (tx.status === "REVOKED") return { found: true, status: "REVOKED", level: "ADVANCED" };
  if (tx.status === "CANCELLED") return { found: true, status: "CANCELLED", level: "ADVANCED" };
  if (tx.status === "EXPIRED") return { found: true, status: "EXPIRED", level: "ADVANCED" };
  if (tx.status !== "COMPLETED") {
    return {
      found: true,
      status: "INVALID",
      level: "ADVANCED",
      detail: `Estado: ${tx.status}`,
    };
  }

  const { data: signedArt } = await admin
    .from("gd_adv_artifacts")
    .select("storage_path, sha256")
    .eq("transaction_id", tx.id)
    .eq("artifact_type", "SIGNED_ADVANCED_DOCUMENT")
    .maybeSingle();

  const { data: manifestArt } = await admin
    .from("gd_adv_artifacts")
    .select("storage_path, sha256")
    .eq("transaction_id", tx.id)
    .eq("artifact_type", "SIGNED_MANIFEST")
    .maybeSingle();

  if (!signedArt || !manifestArt) {
    return {
      found: true,
      status: "EVIDENCE_TAMPERED",
      level: "ADVANCED",
      detail: "Artefatos ausentes.",
    };
  }

  const { data: signedBlob } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(signedArt.storage_path);
  if (!signedBlob) {
    return {
      found: true,
      status: "INVALID",
      level: "ADVANCED",
      detail: "PDF assinado indisponível.",
    };
  }
  const signedHash = sha256Simple(Buffer.from(await signedBlob.arrayBuffer()));
  if (signedHash !== tx.final_document_hash_sha256 || signedHash !== signedArt.sha256) {
    return {
      found: true,
      status: "FILE_TAMPERED",
      level: "ADVANCED",
      detail: "ARQUIVO ALTERADO",
    };
  }

  if (opts.uploadedPdfSha256 && opts.uploadedPdfSha256 !== signedHash) {
    return {
      found: true,
      status: "FILE_TAMPERED",
      level: "ADVANCED",
      detail: "Hash do upload diverge.",
    };
  }

  const { data: keyRow } = await admin
    .from("gd_adv_key_versions")
    .select("public_key_pem, version_label")
    .eq("id", tx.system_key_version_id)
    .maybeSingle();

  const { data: manifestBlob } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(manifestArt.storage_path);

  if (!manifestBlob || !keyRow?.public_key_pem) {
    return {
      found: true,
      status: "EVIDENCE_TAMPERED",
      level: "ADVANCED",
      detail: "Manifesto ou chave indisponível.",
    };
  }

  const manifestRaw = Buffer.from(await manifestBlob.arrayBuffer());
  if (sha256Simple(manifestRaw) !== manifestArt.sha256) {
    return {
      found: true,
      status: "EVIDENCE_TAMPERED",
      level: "ADVANCED",
      detail: "EVIDÊNCIA ALTERADA (manifesto).",
    };
  }

  let envelope: {
    payload_canonical?: string;
    signature_base64?: string;
  };
  try {
    envelope = JSON.parse(manifestRaw.toString("utf8"));
  } catch {
    return {
      found: true,
      status: "EVIDENCE_TAMPERED",
      level: "ADVANCED",
      detail: "Manifesto inválido.",
    };
  }

  const sealOk = verifyManifestSeal({
    payloadCanonical: String(envelope.payload_canonical || ""),
    signatureBase64: String(envelope.signature_base64 || ""),
    publicKeyPem: keyRow.public_key_pem,
  });

  if (!sealOk) {
    return {
      found: true,
      status: "EVIDENCE_TAMPERED",
      level: "ADVANCED",
      detail: "Selagem criptográfica do manifesto inválida.",
    };
  }

  await appendAdvEvent({
    transactionId: tx.id,
    eventType: "VERIFICATION_SUCCESS",
    metadata: { verification_code: code },
  });

  return {
    found: true,
    status: "VALID",
    level: "ADVANCED",
    detail: "Integridade e selagem do manifesto conferem.",
    transaction: {
      id: tx.id,
      document_id: tx.document_id,
      verification_code: tx.verification_code,
      document_hash_sha256: tx.document_hash_sha256,
      final_document_hash_sha256: tx.final_document_hash_sha256,
      completed_at: tx.completed_at,
      identity_level: tx.identity_level,
    },
  };
}
