import type {
  AuthorizeSignatureTransactionInput,
  CancelSignatureTransactionInput,
  CompleteSignatureTransactionInput,
  CreateSignatureTransactionInput,
  SignatureAuthorizationResult,
  SignatureCompletionResult,
  SignatureProvider,
  SignatureTransaction,
  SignatureVerificationResult,
  VerifySignatureTransactionInput,
} from "../core/contracts";
import { SignatureError, SIGNATURE_ERROR_CODES } from "../core/errors";
import {
  criarSessaoCertificado,
  verificarTransacaoCertificado,
} from "./certificateSignService";

/**
 * Provider de Assinatura com Certificado Digital.
 * A chave privada permanece no cliente; o servidor só recebe PDF assinado + metadados públicos.
 */
export class CertificateSignatureProvider implements SignatureProvider {
  readonly level = "CERTIFICATE" as const;

  async createTransaction(
    input: CreateSignatureTransactionInput
  ): Promise<SignatureTransaction> {
    const result = await criarSessaoCertificado({
      documentIds: [input.documentId],
      signerUserId: input.signerUserId,
      actorUserId: input.signerUserId,
    });
    if (result.ok === false) {
      throw new SignatureError(
        SIGNATURE_ERROR_CODES.DOCUMENT_LOCKED,
        result.error,
        result.status || 400
      );
    }
    const item = result.items[0];
    return {
      id: item.transactionId,
      level: "CERTIFICATE",
      status: "PENDING",
      documentId: item.documentId,
      signerId: input.signerUserId,
      documentHashSha256: item.documentHashSha256,
      createdAt: new Date().toISOString(),
    };
  }

  async authorizeTransaction(
    _input: AuthorizeSignatureTransactionInput
  ): Promise<SignatureAuthorizationResult> {
    throw new SignatureError(
      SIGNATURE_ERROR_CODES.WRONG_LEVEL,
      "Autorização do certificado ocorre no cliente (PFX local).",
      501
    );
  }

  async completeTransaction(
    _input: CompleteSignatureTransactionInput
  ): Promise<SignatureCompletionResult> {
    throw new SignatureError(
      SIGNATURE_ERROR_CODES.WRONG_LEVEL,
      "Use a API assinaturas-certificado/concluir com o PDF assinado no cliente.",
      501
    );
  }

  async cancelTransaction(
    _input: CancelSignatureTransactionInput
  ): Promise<void> {
    /* no-op nesta fase */
  }

  async verifyTransaction(
    input: VerifySignatureTransactionInput
  ): Promise<SignatureVerificationResult> {
    const r = await verificarTransacaoCertificado({
      verificationCode: input.verificationCode,
    });
    if (!r.found) {
      return { found: false, status: "NOT_FOUND" };
    }
    return {
      found: true,
      level: "CERTIFICATE",
      status: r.integridadeOk ? "VALID" : "FILE_TAMPERED",
      detail: r.detalhe,
    };
  }
}
