export * from "./core/types";
export * from "./core/contracts";
export * from "./core/errors";
export * from "./core/permissions";
export { SimpleSignatureProvider } from "./simple/SimpleSignatureProvider";
export { AdvancedSignatureProvider } from "./advanced/AdvancedSignatureProvider";
export { CertificateSignatureProvider } from "./certificate/CertificateSignatureProvider";
export {
  criarLoteAvancado,
  concluirLoteAvancado,
  listarLotesAvancados,
} from "./advanced/batchAdvancedService";
export {
  criarSessaoCertificado,
  concluirItemCertificado,
  listarLotesCertificado,
} from "./certificate/certificateSignService";

import type { SignatureLevel } from "./core/types";
import type { SignatureProvider } from "./core/contracts";
import { SimpleSignatureProvider } from "./simple/SimpleSignatureProvider";
import { AdvancedSignatureProvider } from "./advanced/AdvancedSignatureProvider";
import { CertificateSignatureProvider } from "./certificate/CertificateSignatureProvider";
import { SignatureError, SIGNATURE_ERROR_CODES } from "./core/errors";

export function createSignatureProvider(
  level: SignatureLevel
): SignatureProvider {
  if (level === "ADVANCED") return new AdvancedSignatureProvider();
  if (level === "CERTIFICATE") return new CertificateSignatureProvider();
  if (level === "SIMPLE" || level === "LEGACY_SIMPLE") {
    return new SimpleSignatureProvider();
  }
  throw new SignatureError(
    SIGNATURE_ERROR_CODES.WRONG_LEVEL,
    `Nível de assinatura não suportado: ${level}`,
    400
  );
}
