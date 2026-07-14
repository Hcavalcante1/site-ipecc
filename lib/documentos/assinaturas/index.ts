export * from "./core/types";
export * from "./core/contracts";
export * from "./core/errors";
export * from "./core/permissions";
export { SimpleSignatureProvider } from "./simple/SimpleSignatureProvider";
export { AdvancedSignatureProvider } from "./advanced/AdvancedSignatureProvider";

import type { SignatureLevel } from "./core/types";
import type { SignatureProvider } from "./core/contracts";
import { SimpleSignatureProvider } from "./simple/SimpleSignatureProvider";
import { AdvancedSignatureProvider } from "./advanced/AdvancedSignatureProvider";
import { SignatureError, SIGNATURE_ERROR_CODES } from "./core/errors";

export function createSignatureProvider(
  level: SignatureLevel
): SignatureProvider {
  if (level === "ADVANCED") return new AdvancedSignatureProvider();
  if (level === "SIMPLE" || level === "LEGACY_SIMPLE") {
    return new SimpleSignatureProvider();
  }
  throw new SignatureError(
    SIGNATURE_ERROR_CODES.WRONG_LEVEL,
    `Nível de assinatura não suportado: ${level}`,
    400
  );
}
