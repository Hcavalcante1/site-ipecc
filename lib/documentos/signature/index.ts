import type { SignatureProvider } from "./SignatureProvider";
import { DocumensoProvider } from "./DocumensoProvider";
import { GovBrProvider } from "./GovBrProvider";

const providers: Record<string, () => SignatureProvider> = {
  documento: () => new DocumensoProvider(),
  // alias legado
  documenso: () => new DocumensoProvider(),
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
