/** Tipos compartilhados — Assinatura Simples, Avançada e Certificado IPECC. */

export type SignatureLevel =
  | "SIMPLE"
  | "ADVANCED"
  | "LEGACY_SIMPLE"
  | "CERTIFICATE";

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
  | "SIGNED_CERTIFICATE_DOCUMENT"
  | "PKCS7_SIGNATURE"
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
    case "CERTIFICATE":
      return "Assinatura com certificado digital";
    case "SIMPLE":
      return "Assinatura eletrônica simples";
    case "LEGACY_SIMPLE":
      return "Assinatura eletrônica simples (legado)";
    default:
      return "Assinatura eletrônica";
  }
}
