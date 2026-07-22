import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type CertificateVaultMeta = {
  subject: string;
  issuer: string;
  serial: string;
  notBefore: string;
  notAfter: string;
  thumbprintSha256: string;
  thumbprintSha1?: string | null;
  icpBrasil?: {
    cnpj: string | null;
    cpf: string | null;
    responsavel: string | null;
    razaoSocial: string | null;
  } | null;
};

export type CertificateVaultProfile = {
  id: string;
  owner_user_id: string;
  label: string;
  source_filename: string | null;
  cert_subject: string | null;
  cert_issuer: string | null;
  cert_serial: string | null;
  cert_not_before: string | null;
  cert_not_after: string | null;
  cert_thumbprint_sha256: string | null;
  cert_thumbprint_sha1: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  metadata: Record<string, unknown>;
};

const AAD = Buffer.from("ipecc-certificate-vault:v1", "utf8");

function getVaultSecret(): string {
  const secret = process.env.CERTIFICATE_VAULT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "CERTIFICATE_VAULT_SECRET não definido. Configure esta variável de ambiente para proteger o cofre de certificados."
    );
  }
  return secret;
}

function deriveKeyV1(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function deriveKeyV2(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32, { N: 16384, r: 8, p: 1 });
}

function encryptEnvelope(payload: Buffer): string {
  const secret = getVaultSecret();
  const salt = randomBytes(16);
  const key = deriveKeyV2(secret, salt);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 2,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  });
}

function decryptEnvelope(serialized: string): Buffer {
  const parsed = JSON.parse(serialized) as {
    v?: number;
    salt?: string;
    iv?: string;
    tag?: string;
    ciphertext?: string;
  };
  if (!parsed.iv || !parsed.tag || !parsed.ciphertext) {
    throw new Error("Envelope do cofre inválido.");
  }
  const secret = getVaultSecret();
  let key: Buffer;
  if (parsed.v === 2) {
    if (!parsed.salt) throw new Error("Envelope v2 sem salt.");
    key = deriveKeyV2(secret, Buffer.from(parsed.salt, "base64"));
  } else if (parsed.v === 1) {
    key = deriveKeyV1(secret);
  } else {
    throw new Error("Versão de envelope desconhecida.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(parsed.iv, "base64")
  );
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.ciphertext, "base64")),
    decipher.final(),
  ]);
}

function normalizeLabel(label: string | null | undefined, fallback: string): string {
  const value = String(label || "").trim();
  return value || fallback;
}

export async function listCertificateProfiles(ownerUserId: string): Promise<{
  ok: true;
  profiles: CertificateVaultProfile[];
} | {
  ok: false;
  error: string;
  status?: number;
}> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_cert_profiles")
    .select(
      "id, owner_user_id, label, source_filename, cert_subject, cert_issuer, cert_serial, cert_not_before, cert_not_after, cert_thumbprint_sha256, cert_thumbprint_sha1, created_at, updated_at, last_used_at, metadata"
    )
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: error.message || "Falha ao listar certificados salvos.",
      status: 500,
    };
  }

  return {
    ok: true,
    profiles: (data || []) as CertificateVaultProfile[],
  };
}

export async function saveCertificateProfile(opts: {
  ownerUserId: string;
  label?: string | null;
  sourceFilename?: string | null;
  pfxBytes: Buffer;
  meta: CertificateVaultMeta;
}): Promise<
  | { ok: true; profile: CertificateVaultProfile }
  | { ok: false; error: string; status?: number }
> {
  const admin = getSupabaseAdmin();
  const encryptedPayload = encryptEnvelope(opts.pfxBytes);
  const label = normalizeLabel(
    opts.label,
    opts.meta.subject || opts.sourceFilename || "Certificado"
  );

  const { data, error } = await admin
    .from("gd_cert_profiles")
    .insert({
      owner_user_id: opts.ownerUserId,
      label,
      source_filename: opts.sourceFilename || null,
      encrypted_payload: encryptedPayload,
      cert_subject: opts.meta.subject || null,
      cert_issuer: opts.meta.issuer || null,
      cert_serial: opts.meta.serial || null,
      cert_not_before: opts.meta.notBefore || null,
      cert_not_after: opts.meta.notAfter || null,
      cert_thumbprint_sha256: opts.meta.thumbprintSha256 || null,
      cert_thumbprint_sha1: opts.meta.thumbprintSha1 || null,
      metadata: opts.meta.icpBrasil ? { icpBrasil: opts.meta.icpBrasil } : {},
    })
    .select(
      "id, owner_user_id, label, source_filename, cert_subject, cert_issuer, cert_serial, cert_not_before, cert_not_after, cert_thumbprint_sha256, cert_thumbprint_sha1, created_at, updated_at, last_used_at, metadata"
    )
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message || "Falha ao salvar o certificado.",
      status: 500,
    };
  }

  return { ok: true, profile: data as CertificateVaultProfile };
}

export async function getCertificateProfileBytes(opts: {
  profileId: string;
  ownerUserId: string;
}): Promise<
  | { ok: true; bytes: Buffer; profile: CertificateVaultProfile }
  | { ok: false; error: string; status?: number }
> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_cert_profiles")
    .select(
      "id, owner_user_id, label, source_filename, cert_subject, cert_issuer, cert_serial, cert_not_before, cert_not_after, cert_thumbprint_sha256, cert_thumbprint_sha1, created_at, updated_at, last_used_at, metadata, encrypted_payload"
    )
    .eq("id", opts.profileId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message || "Falha ao carregar o certificado.",
      status: 500,
    };
  }
  if (!data) {
    return { ok: false, error: "Certificado não encontrado.", status: 404 };
  }
  if (data.owner_user_id !== opts.ownerUserId) {
    return { ok: false, error: "Apenas o proprietário.", status: 403 };
  }

  let bytes: Buffer;
  try {
    bytes = decryptEnvelope(String((data as { encrypted_payload?: string }).encrypted_payload || ""));
  } catch {
    return {
      ok: false,
      error: "Não foi possível abrir o certificado salvo.",
      status: 500,
    };
  }

  await admin
    .from("gd_cert_profiles")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .eq("owner_user_id", opts.ownerUserId);

  const profile: CertificateVaultProfile = {
    id: data.id,
    owner_user_id: data.owner_user_id,
    label: data.label,
    source_filename: data.source_filename,
    cert_subject: data.cert_subject,
    cert_issuer: data.cert_issuer,
    cert_serial: data.cert_serial,
    cert_not_before: data.cert_not_before,
    cert_not_after: data.cert_not_after,
    cert_thumbprint_sha256: data.cert_thumbprint_sha256,
    cert_thumbprint_sha1: data.cert_thumbprint_sha1,
    created_at: data.created_at,
    updated_at: data.updated_at,
    last_used_at: data.last_used_at,
    metadata: (data.metadata || {}) as Record<string, unknown>,
  };

  return { ok: true, bytes, profile };
}

export async function deleteCertificateProfile(opts: {
  profileId: string;
  ownerUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gd_cert_profiles")
    .delete()
    .eq("id", opts.profileId)
    .eq("owner_user_id", opts.ownerUserId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message || "Falha ao excluir o certificado.",
      status: 500,
    };
  }
  if (!data) {
    return { ok: false, error: "Certificado não encontrado.", status: 404 };
  }
  return { ok: true };
}

