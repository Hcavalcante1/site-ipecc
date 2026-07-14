/** Constantes e tipos do motor Assinatura Eletrônica IPECC. */

export const CONSENTIMENTO_ASSINATURA_IPECC =
  "Li e concordo em assinar eletronicamente este documento.";

export const IPECC_PROVIDER_CODE = "ipecc" as const;

export type IpeccProviderCode = typeof IPECC_PROVIDER_CODE;

export type GdSignatureEvidence = {
  id: string;
  signature_document_id: string;
  signer_id: string | null;
  document_id: string;
  version_id: string | null;
  nome: string;
  cpf: string | null;
  email: string;
  user_id: string;
  signed_at: string;
  timezone: string;
  ip: string | null;
  user_agent: string | null;
  os: string | null;
  browser: string | null;
  screen_resolution: string | null;
  document_hash_sha256: string;
  signed_hash_sha256: string;
  signed_storage_path: string;
  consent_text: string;
  consent_accepted_at: string;
  auth_methods: unknown;
  otp_challenge_id: string | null;
  validation_code: string;
  signature_serial: number;
  cargo: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type ClienteAssinaturaMeta = {
  ip?: string | null;
  userAgent?: string | null;
  os?: string | null;
  browser?: string | null;
  screenResolution?: string | null;
  timezone?: string | null;
};

export const EVIDENCE_SELECT =
  "id, signature_document_id, signer_id, document_id, version_id, nome, cpf, email, user_id, signed_at, timezone, ip, user_agent, os, browser, screen_resolution, document_hash_sha256, signed_hash_sha256, signed_storage_path, consent_text, consent_accepted_at, auth_methods, otp_challenge_id, validation_code, signature_serial, cargo, payload, created_at";

export function validationBaseUrl(): string {
  const fromEnv = String(
    process.env.SIGNATURE_VALIDATION_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      ""
  ).trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://www.ipecc.org.br";
}

export function otpPepper(): string {
  return (
    String(process.env.SIGNATURE_OTP_PEPPER || "").trim() ||
    String(process.env.NEXTAUTH_SECRET || "").trim() ||
    "ipecc-assinatura-dev-pepper"
  );
}
