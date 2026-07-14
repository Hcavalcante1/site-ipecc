/** Tipos compartilhados — Assinatura Simples e Avançada IPECC. */

export type SignatureLevel = "SIMPLE" | "ADVANCED" | "LEGACY_SIMPLE";

export type SignatureStatus =
  | "DRAFT"
  | "PENDING"
  | "AWAITING_SIGNER"
  | "AWAITING_AUTHENTICATION"
  | "AUTHORIZED"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "REVOKED"
  | "FAILED";

export type IdentityVerificationStatus =
  | "NOT_VERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "SUSPENDED"
  | "REVOKED"
  | "EXPIRED";

export type IdentityLevel = "BASIC" | "VERIFIED" | "HIGH";

export type SignatureArtifactType =
  | "ORIGINAL_DOCUMENT"
  | "SIGNED_SIMPLE_DOCUMENT"
  | "SIGNED_ADVANCED_DOCUMENT"
  | "EVIDENCE_CERTIFICATE"
  | "EVIDENCE_JSON"
  | "SIGNED_MANIFEST";

/** Classificação retroativa segura de registros anteriores ao campo level. */
export function nivelAssinaturaLegado(): SignatureLevel {
  return "LEGACY_SIMPLE";
}

export function rotuloNivelAssinatura(level: SignatureLevel): string {
  switch (level) {
    case "ADVANCED":
      return "Assinatura eletrônica avançada";
    case "SIMPLE":
      return "Assinatura eletrônica simples";
    case "LEGACY_SIMPLE":
      return "Assinatura eletrônica simples (legado)";
    default:
      return "Assinatura eletrônica";
  }
}
