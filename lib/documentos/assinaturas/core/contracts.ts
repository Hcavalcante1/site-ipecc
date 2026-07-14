import type { SignatureLevel, SignatureStatus } from "./types";

export type CreateSignatureTransactionInput = {
  organizationId?: string | null;
  documentId: string;
  documentVersionId?: string | null;
  signerUserId: string;
  metadata?: Record<string, unknown>;
};

export type SignatureTransaction = {
  id: string;
  level: SignatureLevel;
  status: SignatureStatus;
  documentId: string;
  documentVersionId?: string | null;
  signerId: string;
  verificationCode?: string | null;
  documentHashSha256?: string | null;
  createdAt: string;
};

export type AuthorizeSignatureTransactionInput = {
  transactionId: string;
  signerUserId: string;
  consentAccepted: boolean;
  consentTextVersion?: string;
  authenticationProof: Record<string, unknown>;
  idempotencyKey?: string;
};

export type SignatureAuthorizationResult = {
  transactionId: string;
  status: SignatureStatus;
  authorizedAt: string;
};

export type CompleteSignatureTransactionInput = {
  transactionId: string;
  signerUserId: string;
  idempotencyKey?: string;
};

export type SignatureCompletionResult = {
  transactionId: string;
  status: SignatureStatus;
  verificationCode: string;
  signedHashSha256: string;
  completedAt: string;
};

export type CancelSignatureTransactionInput = {
  transactionId: string;
  actorUserId: string;
  reason?: string;
};

export type VerifySignatureTransactionInput = {
  verificationCode: string;
  uploadedPdfSha256?: string;
};

export type SignatureVerificationResult = {
  found: boolean;
  level?: SignatureLevel;
  status?:
    | "VALID"
    | "INVALID"
    | "REVOKED"
    | "CANCELLED"
    | "EXPIRED"
    | "FILE_TAMPERED"
    | "EVIDENCE_TAMPERED"
    | "NOT_FOUND";
  detail?: string;
};

/**
 * Contrato comum dos provedores de assinatura IPECC.
 * SimpleSignatureProvider e AdvancedSignatureProvider implementam isto.
 * Sem ICP-Brasil nesta fase.
 */
export interface SignatureProvider {
  readonly level: SignatureLevel;

  createTransaction(
    input: CreateSignatureTransactionInput
  ): Promise<SignatureTransaction>;

  authorizeTransaction(
    input: AuthorizeSignatureTransactionInput
  ): Promise<SignatureAuthorizationResult>;

  completeTransaction(
    input: CompleteSignatureTransactionInput
  ): Promise<SignatureCompletionResult>;

  cancelTransaction(input: CancelSignatureTransactionInput): Promise<void>;

  verifyTransaction(
    input: VerifySignatureTransactionInput
  ): Promise<SignatureVerificationResult>;
}
