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
import { obterValidacaoPublica } from "@/lib/documentos/signing/validationService";

/**
 * Adaptador do motor IPECC atual para o contrato SignatureProvider.
 * O fluxo operacional continua em ipeccSignService / rotas .../ipecc/*;
 * este provider expõe a fachada tipada sem substituir as APIs existentes.
 */
export class SimpleSignatureProvider implements SignatureProvider {
  readonly level = "SIMPLE" as const;

  async createTransaction(
    _input: CreateSignatureTransactionInput
  ): Promise<SignatureTransaction> {
    throw new SignatureError(
      SIGNATURE_ERROR_CODES.WRONG_LEVEL,
      "Use as APIs existentes de pedido IPECC (gd_signature_documents) para criar a transação simples nesta fase.",
      501
    );
  }

  async authorizeTransaction(
    _input: AuthorizeSignatureTransactionInput
  ): Promise<SignatureAuthorizationResult> {
    throw new SignatureError(
      SIGNATURE_ERROR_CODES.WRONG_LEVEL,
      "Autorização simples continua via .../ipecc/iniciar + confirmar.",
      501
    );
  }

  async completeTransaction(
    _input: CompleteSignatureTransactionInput
  ): Promise<SignatureCompletionResult> {
    throw new SignatureError(
      SIGNATURE_ERROR_CODES.WRONG_LEVEL,
      "Conclusão simples continua via .../ipecc/confirmar.",
      501
    );
  }

  async cancelTransaction(
    _input: CancelSignatureTransactionInput
  ): Promise<void> {
    throw new SignatureError(
      SIGNATURE_ERROR_CODES.WRONG_LEVEL,
      "Cancelamento simples ainda não unificado neste provider.",
      501
    );
  }

  async verifyTransaction(
    input: VerifySignatureTransactionInput
  ): Promise<SignatureVerificationResult> {
    const r = await obterValidacaoPublica({ codigo: input.verificationCode });
    if (!r.encontrado) {
      return { found: false, status: "NOT_FOUND" };
    }
    if (input.uploadedPdfSha256) {
      const expected = r.evidencia?.signed_hash_sha256;
      if (expected && input.uploadedPdfSha256 !== expected) {
        return {
          found: true,
          level: "LEGACY_SIMPLE",
          status: "FILE_TAMPERED",
          detail: "Hash do arquivo enviado diverge da evidência.",
        };
      }
    }
    return {
      found: true,
      level: "LEGACY_SIMPLE",
      status: r.integridade?.ok ? "VALID" : "INVALID",
      detail: r.integridade?.detalhe,
    };
  }
}
