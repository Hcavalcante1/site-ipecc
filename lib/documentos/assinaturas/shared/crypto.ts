import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "crypto";

/** Serialização canônica JSON (chaves ordenadas, sem espaços). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeys(obj[key]);
    }
    return out;
  }
  return value;
}

export function sha256Hex(input: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256Bytes(buf: Buffer | Uint8Array): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Hash de CPF normalizado (apenas dígitos) + pepper. Nunca persistir CPF integral. */
export function hashCpf(cpf: string, pepper: string): string {
  const digits = String(cpf || "").replace(/\D/g, "");
  return sha256Hex(`${pepper}:cpf:${digits}`);
}

export function cpfLast4(cpf: string): string {
  const digits = String(cpf || "").replace(/\D/g, "");
  return digits.slice(-4);
}

export type SystemKeyPair = {
  versionLabel: string;
  publicKeyPem: string;
  privateKeyPem: string;
};

/**
 * Chave do sistema para selar manifestos.
 * Privada: só env (nunca no banco / nunca no client).
 */
export function loadSystemSigningKey(): SystemKeyPair | null {
  const versionLabel =
    String(process.env.SIGNATURE_ADV_KEY_VERSION || "").trim() || "v1";
  let privateKeyPem = String(process.env.SIGNATURE_ADV_PRIVATE_KEY_PEM || "")
    .trim()
    .replace(/\\n/g, "\n");
  let publicKeyPem = String(process.env.SIGNATURE_ADV_PUBLIC_KEY_PEM || "")
    .trim()
    .replace(/\\n/g, "\n");

  if (!privateKeyPem && process.env.NODE_ENV !== "production") {
    const generated = generateKeyPairSync("ed25519");
    privateKeyPem = generated.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    publicKeyPem = generated.publicKey.export({ type: "spki", format: "pem" }).toString();
    console.warn(
      "[assinatura-avancada] Usando par Ed25519 efêmero (dev). Defina SIGNATURE_ADV_PRIVATE_KEY_PEM em produção."
    );
  }

  if (!privateKeyPem) return null;
  if (!publicKeyPem) {
    const priv = createPrivateKey(privateKeyPem);
    publicKeyPem = createPublicKey(priv)
      .export({ type: "spki", format: "pem" })
      .toString();
  }

  return { versionLabel, publicKeyPem, privateKeyPem };
}

export function sealManifest(
  manifest: Record<string, unknown>,
  privateKeyPem: string
): { payloadCanonical: string; signatureBase64: string } {
  const payloadCanonical = canonicalJson(manifest);
  const key = createPrivateKey(privateKeyPem);
  const signatureBase64 = sign(null, Buffer.from(payloadCanonical, "utf8"), key).toString(
    "base64"
  );
  return { payloadCanonical, signatureBase64 };
}

export function verifyManifestSeal(opts: {
  payloadCanonical: string;
  signatureBase64: string;
  publicKeyPem: string;
}): boolean {
  try {
    const key = createPublicKey(opts.publicKeyPem);
    return verify(
      null,
      Buffer.from(opts.payloadCanonical, "utf8"),
      key,
      Buffer.from(opts.signatureBase64, "base64")
    );
  } catch {
    return false;
  }
}

export function chainEventHash(
  previousHash: string | null,
  payloadCanonical: string
): string {
  return sha256Hex(`${previousHash || "GENESIS"}|${payloadCanonical}`);
}
