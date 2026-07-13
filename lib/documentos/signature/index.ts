import type { SignatureProvider } from "./SignatureProvider";
import { DocumensoProvider } from "./DocumensoProvider";
import { GovBrProvider } from "./GovBrProvider";

const providers: Record<string, () => SignatureProvider> = {
  documenso: () => new DocumensoProvider(),
  govbr: () => new GovBrProvider(),
};

export function getSignatureProvider(code: string): SignatureProvider {
  const factory = providers[code];
  if (!factory) {
    throw new Error(
      `Provedor de assinatura desconhecido: ${code}. Disponíveis: documenso, govbr. Futuros: icp_brasil, clicksign, autentique, docusign, zapsign, adobe_sign.`
    );
  }
  return factory();
}

export function listSignatureProviderCodes(): string[] {
  return Object.keys(providers);
}
