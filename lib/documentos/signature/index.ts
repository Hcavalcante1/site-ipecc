import type { SignatureProvider } from "./SignatureProvider";
import { DocumentoProvider } from "./DocumentoProvider";
import { IpeccProvider } from "./IpeccProvider";

const providers: Record<string, () => SignatureProvider> = {
  ipecc: () => new IpeccProvider(),
  documento: () => new DocumentoProvider(),
  documenso: () => new DocumentoProvider(), // legado
};

export function getSignatureProvider(code: string): SignatureProvider {
  const factory = providers[code];
  if (!factory) {
    throw new Error(
      `Provedor de assinatura desconhecido: ${code}. Disponíveis: ipecc, documento.`
    );
  }
  return factory();
}

export function listSignatureProviderCodes(): string[] {
  return Object.keys(providers);
}
