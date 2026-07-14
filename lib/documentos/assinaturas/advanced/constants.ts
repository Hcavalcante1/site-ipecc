/** Constantes da Assinatura Eletrônica Avançada IPECC. */

export const ADV_CONSENT_POLICY_CODE = "consent_advanced_v1";
export const ADV_CONSENT_VERSION = "1.0";

export const ADV_CONSENT_TEXT =
  "Declaro que li o documento, concordo com seu conteúdo e confirmo que esta assinatura eletrônica representa minha manifestação pessoal, livre, consciente e inequívoca de vontade. Estou ciente de que esta modalidade não equivale a assinatura qualificada ICP-Brasil.";

export const ADV_BATCH_CONSENT_TEXT =
  "Declaro que visualizei a lista completa dos documentos deste lote, concordo com o conteúdo de cada um e confirmo que esta autorização única de Assinatura Eletrônica Avançada IPECC representa minha manifestação pessoal, livre, consciente e inequívoca de vontade para todos os itens congelados do lote. Estou ciente de que esta modalidade não equivale a assinatura qualificada ICP-Brasil e que não é possível adicionar, remover ou substituir documentos após o congelamento.";

/** Texto seguro para import em client components. */
export const ADV_DISCLAIMER_UI =
  "Esta modalidade não equivale a uma assinatura qualificada ICP-Brasil.";

export const ADV_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const ADV_STORAGE_PREFIX = "advanced";

export const ADV_EVENT_TYPES = [
  "DOCUMENT_SELECTED",
  "DOCUMENT_HASHED",
  "DOCUMENT_LOCKED",
  "DOCUMENT_VIEWED",
  "CONSENT_PRESENTED",
  "CONSENT_ACCEPTED",
  "REAUTHENTICATION_STARTED",
  "REAUTHENTICATION_SUCCESS",
  "REAUTHENTICATION_FAILED",
  "MFA_CHALLENGE_CREATED",
  "MFA_SUCCESS",
  "MFA_FAILED",
  "SIGNATURE_AUTHORIZED",
  "MANIFEST_CREATED",
  "MANIFEST_SEALED",
  "SIGNED_DOCUMENT_GENERATED",
  "FINAL_HASH_CALCULATED",
  "EVIDENCE_JSON_GENERATED",
  "EVIDENCE_CERTIFICATE_GENERATED",
  "SIGNATURE_COMPLETED",
  "SIGNATURE_REJECTED",
  "SIGNATURE_CANCELLED",
  "SIGNATURE_EXPIRED",
  "VERIFICATION_SUCCESS",
  "VERIFICATION_FAILED",
  "DOCUMENT_DOWNLOADED",
] as const;

export type AdvEventType = (typeof ADV_EVENT_TYPES)[number];
