import type {
  SignatureAuthorizeInput,
  SignatureAuthorizeResult,
  SignatureBatchSignInput,
  SignatureBatchSignResult,
  SignatureProvider,
  SignatureSignInput,
  SignatureSignResult,
  SignatureStatusResult,
  SignatureVerifyInput,
  SignatureVerifyResult,
} from "./SignatureProvider";

/**
 * Stub do provedor Assinatura Avançada gov.br (Fase 1).
 * Integração OAuth2 real = Fase 4. Secrets nunca no frontend.
 */
export class GovBrProvider implements SignatureProvider {
  readonly code = "govbr";
  readonly name = "Assinatura Avançada gov.br";

  private ensureConfigured(): void {
    const clientId = process.env.GOVBR_SIGNATURE_CLIENT_ID;
    const clientSecret = process.env.GOVBR_SIGNATURE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        "Provedor gov.br não configurado. Defina GOVBR_SIGNATURE_CLIENT_ID e GOVBR_SIGNATURE_CLIENT_SECRET no servidor (Fase 4)."
      );
    }
  }

  async authorize(
    _input: SignatureAuthorizeInput
  ): Promise<SignatureAuthorizeResult> {
    this.ensureConfigured();
    throw new Error(
      "authorize() gov.br ainda não implementado. Aguarde a Fase 4."
    );
  }

  async sign(_input: SignatureSignInput): Promise<SignatureSignResult> {
    this.ensureConfigured();
    throw new Error("sign() gov.br ainda não implementado. Aguarde a Fase 4.");
  }

  async batchSign(
    _input: SignatureBatchSignInput
  ): Promise<SignatureBatchSignResult> {
    this.ensureConfigured();
    throw new Error(
      "batchSign() gov.br ainda não implementado. Aguarde a Fase 4."
    );
  }

  async verify(_input: SignatureVerifyInput): Promise<SignatureVerifyResult> {
    return {
      valid: false,
      detail: "Verificação gov.br ainda não implementada (Fase 4).",
    };
  }

  async cancel(_externalId: string): Promise<SignatureStatusResult> {
    return {
      status: "cancelled",
      detail: "Cancelamento stub (Fase 1).",
    };
  }

  async status(_externalId: string): Promise<SignatureStatusResult> {
    return {
      status: "unavailable",
      detail: "Status gov.br ainda não implementado (Fase 4).",
    };
  }
}
