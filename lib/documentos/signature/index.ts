import type { SignatureProvider } from "./SignatureProvider";
import { DocumentoProvider } from "./DocumentoProvider";
import { GovBrProvider } from "./GovBrProvider";

const providers: Record<string, () => SignatureProvider> = {
  documento: () => new DocumentoProvider(),
  documenso: () => new DocumentoProvider(), // legado
  govbr: () => new GovBrProvider(),
};

export function getSignatureProvider(code: string): SignatureProvider {
  const factory = providers[code];
  if (!factory) {
    throw new Error(
      `Provedor de assinatura desconhecido: ${code}. Disponíveis: documento, govbr.`
    );
  }
  return factory();
}

export function listSignatureProviderCodes(): string[] {
  return Object.keys(providers);
}
