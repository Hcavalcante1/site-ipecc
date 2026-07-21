/** Constantes e tipos do motor Assinatura Eletrônica IPECC. */
import { getPublicSiteUrl } from "@/lib/seo";

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
  const fromEnv = String(process.env.SIGNATURE_VALIDATION_BASE_URL || "").trim();
  if (fromEnv) {
    try {
      const normalized = new URL(
        /^https?:\/\//i.test(fromEnv) ? fromEnv : `https://${fromEnv}`
      );
      const host = normalized.hostname.toLowerCase();
      if (
        host === "ipecc.org.br" ||
        host.endsWith(".ipecc.org.br") ||
        host === "localhost" ||
        host === "127.0.0.1"
      ) {
        return normalized.toString().replace(/\/$/, "");
      }
    } catch {
      // ignore invalid env url
    }
  }
  return `${getPublicSiteUrl()}/validar`;
}

export function otpPepper(): string {
  const fromEnv =
    String(process.env.SIGNATURE_OTP_PEPPER || "").trim() ||
    String(process.env.NEXTAUTH_SECRET || "").trim();
  if (fromEnv) return fromEnv;

  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (isProd) {
    throw new Error(
      "SIGNATURE_OTP_PEPPER (ou NEXTAUTH_SECRET) é obrigatório em produção."
    );
  }
  return "ipecc-assinatura-dev-pepper";
}

/** Ecoar OTP no painel quando o e-mail falha: só em não-produção ou com flag explícita. */
export function otpPermitirCodigoNoPainel(): boolean {
  const flag = String(process.env.SIGNATURE_OTP_ALLOW_PANEL_FALLBACK || "")
    .trim()
    .toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.VERCEL_ENV !== "production"
  );
}
