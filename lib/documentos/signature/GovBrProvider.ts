import { randomBytes, createHash } from "crypto";
import type {
  SignatureAuthorizeInput,
  SignatureAuthorizeResult,
  SignatureBatchSignInput,
  SignatureBatchSignResult,
  SignatureProvider,
  SignatureSignInput,
  SignatureSignResult,
  SignatureStatusResult,
  SignatureVerifyInput,
  SignatureVerifyResult,
} from "./SignatureProvider";

type GovBrUrls = {
  authorize: string;
  token: string;
  signPkcs7: string;
  certificado: string;
};

function resolveUrls(): GovBrUrls {
  const env = (process.env.GOVBR_SIGNATURE_ENV || "staging").toLowerCase();
  const isProd = env === "production" || env === "prod";
  const cas =
    process.env.GOVBR_SIGNATURE_CAS_URL ||
    (isProd
      ? "https://cas.iti.br/oauth2.0"
      : "https://cas.staging.iti.br/oauth2.0");
  const api =
    process.env.GOVBR_SIGNATURE_API_URL ||
    (isProd
      ? "https://assinatura-api.iti.br/externo/v2"
      : "https://assinatura-api.staging.iti.br/externo/v2");
  return {
    authorize: `${cas}/authorize`,
    token: `${cas}/token`,
    signPkcs7: `${api}/assinarPKCS7`,
    certificado: `${api}/certificadoPublico`,
  };
}

export function govbrConfigurado(): boolean {
  return Boolean(
    process.env.GOVBR_SIGNATURE_CLIENT_ID?.trim() &&
      process.env.GOVBR_SIGNATURE_CLIENT_SECRET?.trim()
  );
}

export function govbrRedirectUriPadrao(): string {
  const explicit = process.env.GOVBR_SIGNATURE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (site) {
    return `${site}/api/admin/documentos/assinaturas/callback`;
  }
  return "http://localhost:3000/api/admin/documentos/assinaturas/callback";
}

/**
 * Provedor Assinatura Avançada gov.br (ITI) — OAuth2 + PKCS#7.
 * Secrets somente no servidor (GOVBR_SIGNATURE_*).
 */
export class GovBrProvider implements SignatureProvider {
  readonly code = "govbr";
  readonly name = "Assinatura Avançada gov.br";

  private clientId(): string {
    const v = process.env.GOVBR_SIGNATURE_CLIENT_ID?.trim();
    if (!v) {
      throw new Error(
        "Provedor gov.br não configurado. Defina GOVBR_SIGNATURE_CLIENT_ID no servidor."
      );
    }
    return v;
  }

  private clientSecret(): string {
    const v = process.env.GOVBR_SIGNATURE_CLIENT_SECRET?.trim();
    if (!v) {
      throw new Error(
        "Provedor gov.br não configurado. Defina GOVBR_SIGNATURE_CLIENT_SECRET no servidor."
      );
    }
    return v;
  }

  async authorize(
    input: SignatureAuthorizeInput
  ): Promise<SignatureAuthorizeResult> {
    const urls = resolveUrls();
    const state = input.state || randomBytes(24).toString("hex");
    const scopes = (input.scopes || ["sign", "govbr"]).join(" ");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId(),
      redirect_uri: input.redirectUri,
      scope: scopes,
      state,
      nonce: randomBytes(12).toString("hex"),
    });
    return {
      authorizationUrl: `${urls.authorize}?${params.toString()}`,
      state,
    };
  }

  async exchangeCode(opts: {
    code: string;
    redirectUri: string;
  }): Promise<{ accessToken: string; expiresIn?: number }> {
    const urls = resolveUrls();
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      redirect_uri: opts.redirectUri,
    });
    const res = await fetch(`${urls.token}?`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      const msg =
        (json.error_description as string) ||
        (json.error as string) ||
        text.slice(0, 200) ||
        `HTTP ${res.status}`;
      throw new Error(`Falha ao obter token gov.br: ${msg}`);
    }
    const accessToken = String(json.access_token || "");
    if (!accessToken) {
      throw new Error("Resposta de token gov.br sem access_token.");
    }
    return {
      accessToken,
      expiresIn:
        typeof json.expires_in === "number" ? json.expires_in : undefined,
    };
  }

  /** Assina hash e devolve bytes PKCS#7. */
  async assinarPkcs7Bytes(opts: {
    accessToken: string;
    fileHashSha256Hex: string;
  }): Promise<{ pkcs7: Buffer; signedHash: string }> {
    const urls = resolveUrls();
    const hashBase64 = Buffer.from(opts.fileHashSha256Hex, "hex").toString(
      "base64"
    );
    const res = await fetch(urls.signPkcs7, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/octet-stream, application/json",
      },
      body: JSON.stringify({ hashBase64 }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Falha ao assinar PKCS#7 gov.br (HTTP ${res.status}): ${errText.slice(0, 300)}`
      );
    }
    const pkcs7 = Buffer.from(await res.arrayBuffer());
    return {
      pkcs7,
      signedHash: createHash("sha256").update(pkcs7).digest("hex"),
    };
  }

  async sign(input: SignatureSignInput): Promise<SignatureSignResult> {
    const { signedHash } = await this.assinarPkcs7Bytes({
      accessToken: input.accessToken,
      fileHashSha256Hex: input.fileHashSha256,
    });
    return {
      externalId: input.sessionId || `govbr-${Date.now()}`,
      signedHash,
      status: "signed",
    };
  }

  async batchSign(
    input: SignatureBatchSignInput
  ): Promise<SignatureBatchSignResult> {
    const items: SignatureBatchSignResult["items"] = [];
    for (const item of input.items) {
      try {
        await this.assinarPkcs7Bytes({
          accessToken: input.accessToken,
          fileHashSha256Hex: item.fileHashSha256,
        });
        items.push({ documentId: item.documentId, status: "signed" });
      } catch (err) {
        items.push({
          documentId: item.documentId,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return {
      externalSessionId: input.sessionId,
      items,
    };
  }

  async verify(_input: SignatureVerifyInput): Promise<SignatureVerifyResult> {
    return {
      valid: false,
      detail:
        "Validação oficial em https://validar.iti.gov.br — use o arquivo .p7s gerado.",
    };
  }

  async cancel(_externalId: string): Promise<SignatureStatusResult> {
    return { status: "cancelled", detail: "Sessão local cancelada." };
  }

  async status(_externalId: string): Promise<SignatureStatusResult> {
    return {
      status: govbrConfigurado() ? "ready" : "unavailable",
      detail: govbrConfigurado()
        ? "Provedor configurado; status detalhado depende da sessão OAuth."
        : "Credenciais GOVBR_SIGNATURE_* ausentes.",
    };
  }
}
