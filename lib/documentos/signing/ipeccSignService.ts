import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "../types";
import { registrarLog } from "../documentsService";
import { notificarEventoDocumental } from "../notificationsService";
import {
  CONSENTIMENTO_ASSINATURA_IPECC,
  IPECC_PROVIDER_CODE,
  type ClienteAssinaturaMeta,
} from "./constants";
import { criarEEnviarOtp, consumirOtp } from "./otpService";
import { confirmarSenhaUsuario } from "./passwordConfirm";
import { carimbarPdfAssinatura, validarCpfBasico } from "./pdfStampService";
import type { StampPlacement } from "./pdfStampService";
import {
  gerarCodigoValidacao,
  proximoSerialAssinatura,
  registrarEvidencia,
  sha256Bytes,
} from "./evidenceService";

const SIG_SELECT =
  "id, document_id, version_id, provider_code, status, signed_storage_path, signed_hash, error_message, created_by, validation_code, signing_mode, stamped_version_id";

function tabelaAusente(message?: string) {
  return /relation .* does not exist|could not find the table|42P01/i.test(
    message || ""
  );
}

export function ipeccConfigurado(): boolean {
  // Motor interno — sempre disponível no app; depende só do Supabase.
  return true;
}

export async function iniciarAssinaturaIpecc(opts: {
  signatureDocumentId: string;
  userId: string;
  actorEmail: string;
  consentAccepted: boolean;
  client: ClienteAssinaturaMeta;
}): Promise<
  | {
      ok: true;
      challengeId: string;
      consentText: string;
      devCode?: string;
      emailWarning?: string;
    }
  | { ok: false; error: string; status?: number }
> {
  if (!opts.consentAccepted) {
    return {
      ok: false,
      error: "É obrigatório aceitar o termo de assinatura eletrônica.",
      status: 400,
    };
  }

  const admin = getSupabaseAdmin();
  const { data: sig, error } = await admin
    .from("gd_signature_documents")
    .select(SIG_SELECT)
    .eq("id", opts.signatureDocumentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !sig) {
    return {
      ok: false,
      error: tabelaAusente(error?.message)
        ? "Tabelas de assinatura ausentes."
        : "Pedido de assinatura não encontrado.",
      status: 404,
    };
  }

  if (sig.provider_code !== IPECC_PROVIDER_CODE) {
    return {
      ok: false,
      error: "Este pedido não usa o motor IPECC.",
      status: 400,
    };
  }

  if (sig.status === "signed") {
    return { ok: false, error: "Documento já assinado.", status: 400 };
  }

  const email = String(opts.actorEmail || "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, error: "E-mail do usuário inválido.", status: 400 };
  }

  await admin
    .from("gd_signature_documents")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", sig.id);

  await admin.from("gd_signature_events").insert({
    signature_document_id: sig.id,
    event_type: "consent_accepted",
    payload: {
      consent_text: CONSENTIMENTO_ASSINATURA_IPECC,
      email,
    },
    ip: opts.client.ip || null,
    user_agent: opts.client.userAgent || null,
    created_by: opts.userId,
  });

  const otp = await criarEEnviarOtp({
    signatureDocumentId: sig.id,
    userId: opts.userId,
    email,
    ip: opts.client.ip,
  });

  if (otp.ok === false) {
    return { ok: false, error: otp.error, status: otp.status };
  }

  return {
    ok: true,
    challengeId: otp.challengeId,
    consentText: CONSENTIMENTO_ASSINATURA_IPECC,
    ...(otp.devCode ? { devCode: otp.devCode } : {}),
    ...(otp.emailWarning ? { emailWarning: otp.emailWarning } : {}),
  };
}

export async function confirmarAssinaturaIpecc(opts: {
  signatureDocumentId: string;
  userId: string;
  actorEmail: string;
  actorName?: string | null;
  password: string;
  otpCode: string;
  challengeId: string;
  consentAccepted: boolean;
  cpf?: string | null;
  cargo?: string | null;
  client: ClienteAssinaturaMeta;
  /** Quando true (lote), senha/OTP já foram validados. */
  skipAuth?: boolean;
  placement?: StampPlacement;
}): Promise<
  | {
      ok: true;
      validationCode: string;
      signedHash: string;
      evidenceId: string;
      documentoConcluido: boolean;
    }
  | { ok: false; error: string; status?: number }
> {
  if (!opts.consentAccepted) {
    return {
      ok: false,
      error: "É obrigatório aceitar o termo de assinatura eletrônica.",
      status: 400,
    };
  }

  const email = String(opts.actorEmail || "")
    .trim()
    .toLowerCase();

  if (!opts.skipAuth) {
    const senha = await confirmarSenhaUsuario({
      email,
      password: opts.password,
    });
    if (senha.ok === false) {
      return { ok: false, error: senha.error, status: 401 };
    }

    const otp = await consumirOtp({
      challengeId: opts.challengeId,
      code: opts.otpCode,
      userId: opts.userId,
    });
    if (otp.ok === false) {
      return { ok: false, error: otp.error, status: otp.status };
    }
  }

  const admin = getSupabaseAdmin();
  const { data: sig, error: sigErr } = await admin
    .from("gd_signature_documents")
    .select(SIG_SELECT)
    .eq("id", opts.signatureDocumentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (sigErr || !sig) {
    return { ok: false, error: "Pedido de assinatura não encontrado.", status: 404 };
  }
  if (sig.provider_code !== IPECC_PROVIDER_CODE) {
    return { ok: false, error: "Pedido não é do motor IPECC.", status: 400 };
  }
  if (sig.status === "signed") {
    return { ok: false, error: "Documento já assinado.", status: 400 };
  }

  const { data: allSigners } = await admin
    .from("gd_signature_signers")
    .select("id, email, cargo, status, mode, required, sort_order, user_id")
    .eq("signature_document_id", sig.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  const signers = allSigners || [];
  const pendingSigners = signers.filter((s) => s.status !== "signed");
  const signingMode =
    (sig as { signing_mode?: string }).signing_mode ||
    signers[0]?.mode ||
    "sequential";

  let signer = pendingSigners[0] || null;
  if (pendingSigners.length > 0) {
    if (signingMode === "sequential") {
      const next = pendingSigners[0];
      const nextEmail = String(next.email || "")
        .trim()
        .toLowerCase();
      if (nextEmail && nextEmail !== email) {
        return {
          ok: false,
          error: `Assinatura sequencial: aguarde o próximo signatário (${next.cargo || nextEmail}).`,
          status: 403,
        };
      }
      signer = next;
    } else {
      signer =
        pendingSigners.find(
          (s) =>
            String(s.email || "")
              .trim()
              .toLowerCase() === email
        ) || pendingSigners[0];
    }
  }

  const { data: doc } = await admin
    .from("gd_documents")
    .select(
      "id, title, processo_id, storage_path, file_hash, current_version, mime_type, file_name"
    )
    .eq("id", sig.document_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!doc?.storage_path) {
    return {
      ok: false,
      error: "Documento sem arquivo para assinar.",
      status: 400,
    };
  }

  const { data: fileBlob, error: dlErr } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .download(doc.storage_path);

  if (dlErr || !fileBlob) {
    return {
      ok: false,
      error: dlErr?.message || "Falha ao baixar PDF do Storage.",
      status: 500,
    };
  }

  const originalBuf = Buffer.from(await fileBlob.arrayBuffer());
  const documentHash = sha256Bytes(originalBuf);
  const signedAt = new Date();
  const timezone =
    String(opts.client.timezone || "").trim() || "America/Sao_Paulo";
  const validationCode = gerarCodigoValidacao();
  const serial = await proximoSerialAssinatura(doc.id);
  const nome = String(opts.actorName || "").trim();
  const cpf = String(opts.cpf || "").trim();
  if (!nome || nome.length < 3) {
    return {
      ok: false,
      error: "Informe o nome completo de quem assina.",
      status: 400,
    };
  }
  if (!validarCpfBasico(cpf)) {
    return {
      ok: false,
      error: "Informe um CPF válido (11 dígitos) para o carimbo.",
      status: 400,
    };
  }
  // Evita o legado “admin” vindo do local-part do e-mail
  if (/^admin$/i.test(nome)) {
    return {
      ok: false,
      error: "Use o nome civil completo, não o login.",
      status: 400,
    };
  }

  let stamped: Uint8Array;
  try {
    stamped = await carimbarPdfAssinatura({
      pdfBytes: originalBuf,
      nome,
      cpf,
      cargo: opts.cargo || signer?.cargo,
      email,
      signedAt,
      timezone,
      signatureSerial: serial,
      validationCode,
      placement: opts.placement,
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Falha ao carimbar PDF: ${e.message}`
          : "Falha ao carimbar PDF.",
      status: 500,
    };
  }

  const signedHash = sha256Bytes(stamped);
  const stampedPath = `${doc.id}/signed/${sig.id}-${serial}.pdf`;

  const { error: upErr } = await admin.storage
    .from(GD_STORAGE_BUCKET)
    .upload(stampedPath, stamped, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (upErr) {
    return {
      ok: false,
      error: upErr.message || "Falha ao salvar PDF assinado.",
      status: 500,
    };
  }

  const nextVersion = (doc.current_version || 1) + 1;
  const { data: versionRow } = await admin
    .from("gd_document_versions")
    .insert({
      document_id: doc.id,
      version_number: nextVersion,
      storage_path: stampedPath,
      mime_type: "application/pdf",
      file_name: doc.file_name
        ? String(doc.file_name).replace(/\.pdf$/i, "") + "-assinado.pdf"
        : `assinado-${serial}.pdf`,
      file_size: stamped.byteLength,
      file_hash: signedHash,
      change_note: `Assinatura eletrônica IPECC #${serial}`,
      created_by: opts.userId,
    })
    .select("id")
    .single();

  const evidence = await registrarEvidencia({
    signatureDocumentId: sig.id,
    signerId: signer?.id || null,
    documentId: doc.id,
    versionId: versionRow?.id || sig.version_id,
    nome,
    cpf: opts.cpf,
    email,
    userId: opts.userId,
    signedAt,
    timezone,
    client: opts.client,
    documentHashSha256: documentHash,
    signedHashSha256: signedHash,
    signedStoragePath: stampedPath,
    consentAcceptedAt: signedAt,
    otpChallengeId: opts.challengeId,
    validationCode,
    signatureSerial: serial,
    cargo: opts.cargo || signer?.cargo || null,
  });

  if (evidence.ok === false) {
    return { ok: false, error: evidence.error, status: 500 };
  }

  if (signer?.id) {
    await admin
      .from("gd_signature_signers")
      .update({
        status: "signed",
        signed_at: signedAt.toISOString(),
        user_id: opts.userId,
        updated_at: signedAt.toISOString(),
      })
      .eq("id", signer.id);
  }

  const { data: signersApos } = await admin
    .from("gd_signature_signers")
    .select("id, status, required")
    .eq("signature_document_id", sig.id)
    .is("deleted_at", null);

  const requiredPending = (signersApos || []).filter(
    (s) => s.required !== false && s.status !== "signed"
  );
  const documentoConcluido =
    signers.length === 0 || requiredPending.length === 0;

  await admin
    .from("gd_documents")
    .update({
      storage_path: stampedPath,
      file_hash: signedHash,
      mime_type: "application/pdf",
      current_version: nextVersion,
      file_size: stamped.byteLength,
      ...(documentoConcluido ? { status: "signed" } : {}),
      updated_at: signedAt.toISOString(),
    })
    .eq("id", doc.id);

  await admin
    .from("gd_signature_documents")
    .update({
      status: documentoConcluido ? "signed" : "signing",
      signed_storage_path: stampedPath,
      signed_hash: signedHash,
      validation_code: documentoConcluido
        ? validationCode
        : sig.validation_code || validationCode,
      stamped_version_id: versionRow?.id || null,
      updated_at: signedAt.toISOString(),
      error_message: null,
    })
    .eq("id", sig.id);

  await admin.from("gd_signature_events").insert({
    signature_document_id: sig.id,
    signer_id: signer?.id || null,
    event_type: documentoConcluido ? "signed_ipecc" : "partial_signed_ipecc",
    payload: {
      validation_code: validationCode,
      signed_hash: signedHash,
      evidence_id: evidence.evidence.id,
      documento_concluido: documentoConcluido,
    },
    ip: opts.client.ip || null,
    user_agent: opts.client.userAgent || null,
    created_by: opts.userId,
  });

  await registrarLog({
    processo_id: doc.processo_id,
    document_id: doc.id,
    action: documentoConcluido
      ? "assinatura_ipecc_concluida"
      : "assinatura_ipecc_parcial",
    detail: {
      signature_document_id: sig.id,
      validation_code: validationCode,
      evidence_id: evidence.evidence.id,
    },
    actor_id: opts.userId,
    ip: opts.client.ip,
    user_agent: opts.client.userAgent,
  });

  await notificarEventoDocumental({
    processo_id: doc.processo_id,
    document_id: doc.id,
    user_id: opts.userId,
    email,
    event_type: documentoConcluido
      ? "assinatura_concluida"
      : "assinatura_parcial",
    title: documentoConcluido
      ? "Documento assinado (IPECC)"
      : "Assinatura parcial (IPECC)",
    body: documentoConcluido
      ? `${doc.title || "Documento"} assinado. Código: ${validationCode}`
      : `${doc.title || "Documento"}: aguardando demais signatários.`,
    link_path: `/admin/documentos/documentos/${doc.id}`,
    created_by: opts.userId,
  });

  if (documentoConcluido) {
    try {
      const { publicarEmissaoAposAssinatura } = await import(
        "@/lib/documentos-oficiais"
      );
      await publicarEmissaoAposAssinatura({
        gdDocumentId: doc.id,
        signedStoragePath: stampedPath,
      });
    } catch {
      // módulo/emissão podem não existir — fluxo DMS puro segue OK
    }
  }

  return {
    ok: true,
    validationCode,
    signedHash,
    evidenceId: evidence.evidence.id,
    documentoConcluido,
  };
}
