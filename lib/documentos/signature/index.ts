import type { SignatureProvider } from "./SignatureProvider";
import { GovBrProvider } from "./GovBrProvider";

const providers: Record<string, () => SignatureProvider> = {
  govbr: () => new GovBrProvider(),
};

export function getSignatureProvider(code: string): SignatureProvider {
  const factory = providers[code];
  if (!factory) {
    throw new Error(
      `Provedor de assinatura desconhecido: ${code}. Provedores futuros: icp_brasil, clicksign, autentique, docusign, zapsign, adobe_sign.`
    );
  }
  return factory();
}

export function listSignatureProviderCodes(): string[] {
  return Object.keys(providers);
}
