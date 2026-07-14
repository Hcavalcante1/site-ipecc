import { createHash, randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CONSENTIMENTO_ASSINATURA_IPECC,
  EVIDENCE_SELECT,
  type ClienteAssinaturaMeta,
  type GdSignatureEvidence,
} from "./constants";

export function gerarCodigoValidacao(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

export function parseUaMeta(userAgent: string | null | undefined): {
  os: string | null;
  browser: string | null;
} {
  const ua = String(userAgent || "");
  if (!ua) return { os: null, browser: null };

  let os: string | null = null;
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser: string | null = null;
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return { os, browser };
}

export async function proximoSerialAssinatura(
  documentId: string
): Promise<number> {
  const admin = getSupabaseAdmin();
  const { count } = await admin
    .from("gd_signature_evidences")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);
  return (count || 0) + 1;
}

export async function registrarEvidencia(opts: {
  signatureDocumentId: string;
  signerId: string | null;
  documentId: string;
  versionId: string | null;
  nome: string;
  cpf?: string | null;
  email: string;
  userId: string;
  signedAt: Date;
  timezone: string;
  client: ClienteAssinaturaMeta;
  documentHashSha256: string;
  signedHashSha256: string;
  signedStoragePath: string;
  consentAcceptedAt: Date;
  otpChallengeId: string;
  validationCode: string;
  signatureSerial: number;
  cargo?: string | null;
  payload?: Record<string, unknown>;
}): Promise<
  | { ok: true; evidence: GdSignatureEvidence }
  | { ok: false; error: string }
> {
  const admin = getSupabaseAdmin();
  const uaParsed = parseUaMeta(opts.client.userAgent);
  const { data, error } = await admin
    .from("gd_signature_evidences")
    .insert({
      signature_document_id: opts.signatureDocumentId,
      signer_id: opts.signerId,
      document_id: opts.documentId,
      version_id: opts.versionId,
      nome: opts.nome,
      cpf: opts.cpf || null,
      email: opts.email,
      user_id: opts.userId,
      signed_at: opts.signedAt.toISOString(),
      timezone: opts.timezone,
      ip: opts.client.ip || null,
      user_agent: opts.client.userAgent || null,
      os: opts.client.os || uaParsed.os,
      browser: opts.client.browser || uaParsed.browser,
      screen_resolution: opts.client.screenResolution || null,
      document_hash_sha256: opts.documentHashSha256,
      signed_hash_sha256: opts.signedHashSha256,
      signed_storage_path: opts.signedStoragePath,
      consent_text: CONSENTIMENTO_ASSINATURA_IPECC,
      consent_accepted_at: opts.consentAcceptedAt.toISOString(),
      auth_methods: ["password", "email_otp"],
      otp_challenge_id: opts.otpChallengeId,
      validation_code: opts.validationCode,
      signature_serial: opts.signatureSerial,
      cargo: opts.cargo || null,
      payload: opts.payload || {},
    })
    .select(EVIDENCE_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message || "Falha ao registrar evidência.",
    };
  }

  return { ok: true, evidence: data as GdSignatureEvidence };
}

export async function buscarEvidenciaPorCodigo(codigo: string) {
  const admin = getSupabaseAdmin();
  const code = String(codigo || "")
    .trim()
    .toUpperCase();
  if (!code) return { data: null, error: null };

  const { data, error } = await admin
    .from("gd_signature_evidences")
    .select(EVIDENCE_SELECT)
    .eq("validation_code", code)
    .maybeSingle();

  return { data: data as GdSignatureEvidence | null, error };
}

export async function registrarConsultaValidacao(opts: {
  validationCode: string;
  found: boolean;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const admin = getSupabaseAdmin();
  await admin.from("gd_validation_lookups").insert({
    validation_code: opts.validationCode,
    found: opts.found,
    ip: opts.ip || null,
    user_agent: opts.userAgent || null,
  });
}

export function sha256Bytes(buf: Uint8Array | Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
