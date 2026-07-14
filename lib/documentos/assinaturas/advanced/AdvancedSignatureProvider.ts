import type { SignatureProvider } from "../core/contracts";
import type {
  AuthorizeSignatureTransactionInput,
  CancelSignatureTransactionInput,
  CompleteSignatureTransactionInput,
  CreateSignatureTransactionInput,
  SignatureAuthorizationResult,
  SignatureCompletionResult,
  SignatureTransaction,
  VerifySignatureTransactionInput,
  SignatureVerificationResult,
} from "../core/contracts";
import { SignatureError, SIGNATURE_ERROR_CODES } from "../core/errors";
import {
  aceitarConsentimentoAvancado,
  autorizarTransacaoAvancada,
  concluirTransacaoAvancada,
  criarTransacaoAvancada,
  verificarTransacaoAvancada,
} from "./advancedSignService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Provedor de Assinatura Eletrônica Avançada IPECC.
 * Não é ICP-Brasil. Exige identidade habilitada, consentimento, reauth + MFA.
 */
export class AdvancedSignatureProvider implements SignatureProvider {
  readonly level = "ADVANCED" as const;

  async createTransaction(
    input: CreateSignatureTransactionInput
  ): Promise<SignatureTransaction> {
    const result = await criarTransacaoAvancada({
      documentId: input.documentId,
      signerUserId: input.signerUserId,
      actorUserId: input.signerUserId,
      processoId: input.organizationId || null,
      idempotencyKey:
        typeof input.metadata?.idempotencyKey === "string"
          ? input.metadata.idempotencyKey
          : null,
    });
    if (result.ok === false) {
      throw new SignatureError(
        SIGNATURE_ERROR_CODES.FORBIDDEN,
        result.error,
        typeof result.status === "number" ? result.status : 400
      );
    }
    return {
      id: result.transactionId,
      level: "ADVANCED",
      status: "AWAITING_SIGNER",
      documentId: input.documentId,
      documentVersionId: input.documentVersionId,
      signerId: input.signerUserId,
      documentHashSha256: result.documentHashSha256,
      createdAt: new Date().toISOString(),
    };
  }

  async authorizeTransaction(
    input: AuthorizeSignatureTransactionInput
  ): Promise<SignatureAuthorizationResult> {
    const proof = input.authenticationProof || {};
    if (!input.consentAccepted) {
      throw new SignatureError(
        SIGNATURE_ERROR_CODES.CONSENT_REQUIRED,
        "Consentimento obrigatório.",
        400
      );
    }

    const consent = await aceitarConsentimentoAvancado({
      transactionId: input.transactionId,
      signerUserId: input.signerUserId,
      consentAccepted: true,
      documentViewed: Boolean(proof.documentViewed ?? true),
      sessionId:
        typeof proof.sessionId === "string" ? proof.sessionId : null,
    });
    if (consent.ok === false) {
      throw new SignatureError(
        SIGNATURE_ERROR_CODES.CONSENT_REQUIRED,
        consent.error,
        typeof consent.status === "number" ? consent.status : 400
      );
    }

    const auth = await autorizarTransacaoAvancada({
      transactionId: input.transactionId,
      signerUserId: input.signerUserId,
      actorEmail: String(proof.email || ""),
      password: String(proof.password || ""),
      otpCode: String(proof.otpCode || ""),
      challengeId: String(proof.challengeId || ""),
    });
    if (auth.ok === false) {
      throw new SignatureError(
        SIGNATURE_ERROR_CODES.CHALLENGE_EXPIRED,
        auth.error,
        typeof auth.status === "number" ? auth.status : 401
      );
    }

    return {
      transactionId: input.transactionId,
      status: "AUTHORIZED",
      authorizedAt: new Date().toISOString(),
    };
  }

  async completeTransaction(
    input: CompleteSignatureTransactionInput
  ): Promise<SignatureCompletionResult> {
    const proof = (input as CompleteSignatureTransactionInput & {
      actorName?: string;
      cpf?: string;
      cargo?: string;
    }) as {
      transactionId: string;
      signerUserId: string;
      actorName?: string;
      cpf?: string;
      cargo?: string;
    };

    const result = await concluirTransacaoAvancada({
      transactionId: input.transactionId,
      signerUserId: input.signerUserId,
      actorName: proof.actorName || "Signatário",
      cpf: proof.cpf || "",
      cargo: proof.cargo || null,
    });
    if (result.ok === false) {
      throw new SignatureError(
        SIGNATURE_ERROR_CODES.INTEGRITY_FAILED,
        result.error,
        typeof result.status === "number" ? result.status : 400
      );
    }
    return {
      transactionId: result.transactionId,
      status: "COMPLETED",
      verificationCode: result.verificationCode,
      signedHashSha256: result.signedHash,
      completedAt: new Date().toISOString(),
    };
  }

  async cancelTransaction(
    input: CancelSignatureTransactionInput
  ): Promise<void> {
    const admin = getSupabaseAdmin();
    const { data: tx } = await admin
      .from("gd_adv_transactions")
      .select("id, signer_user_id, status")
      .eq("id", input.transactionId)
      .maybeSingle();
    if (!tx) {
      throw new SignatureError(
        SIGNATURE_ERROR_CODES.NOT_FOUND,
        "Transação não encontrada.",
        404
      );
    }
    if (tx.signer_user_id !== input.actorUserId) {
      throw new SignatureError(
        SIGNATURE_ERROR_CODES.FORBIDDEN,
        "Apenas o signatário pode cancelar.",
        403
      );
    }
    if (tx.status === "COMPLETED") {
      throw new SignatureError(
        SIGNATURE_ERROR_CODES.ALREADY_SIGNED,
        "Transação já concluída.",
        400
      );
    }
    const now = new Date().toISOString();
    await admin
      .from("gd_adv_transactions")
      .update({
        status: "CANCELLED",
        cancelled_at: now,
        updated_at: now,
        metadata: { cancel_reason: input.reason || null },
      })
      .eq("id", tx.id);
  }

  async verifyTransaction(
    input: VerifySignatureTransactionInput
  ): Promise<SignatureVerificationResult> {
    const r = await verificarTransacaoAvancada({
      verificationCode: input.verificationCode,
      uploadedPdfSha256: input.uploadedPdfSha256,
    });
    return {
      found: r.found,
      level: r.level,
      status: r.status,
      detail: r.detail,
    };
  }
}
