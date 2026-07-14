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

/**
 * Placeholder tipado do módulo avançado.
 * Implementação completa nas etapas 6–13 (identidade, MFA, manifesto, etc.).
 */
export class AdvancedSignatureProvider implements SignatureProvider {
  readonly level = "ADVANCED" as const;

  private notReady(action: string): never {
    throw new SignatureError(
      SIGNATURE_ERROR_CODES.WRONG_LEVEL,
      `Assinatura avançada: ${action} ainda não implementado nesta fase.`,
      501
    );
  }

  async createTransaction(
    _input: CreateSignatureTransactionInput
  ): Promise<SignatureTransaction> {
    this.notReady("createTransaction");
  }

  async authorizeTransaction(
    _input: AuthorizeSignatureTransactionInput
  ): Promise<SignatureAuthorizationResult> {
    this.notReady("authorizeTransaction");
  }

  async completeTransaction(
    _input: CompleteSignatureTransactionInput
  ): Promise<SignatureCompletionResult> {
    this.notReady("completeTransaction");
  }

  async cancelTransaction(
    _input: CancelSignatureTransactionInput
  ): Promise<void> {
    this.notReady("cancelTransaction");
  }

  async verifyTransaction(
    _input: VerifySignatureTransactionInput
  ): Promise<SignatureVerificationResult> {
    this.notReady("verifyTransaction");
  }
}
