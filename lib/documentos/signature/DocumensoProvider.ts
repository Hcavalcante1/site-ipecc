/**
 * Provedor Documenso (open source / self-hosted) via API v2.
 * Secrets somente no servidor (DOCUMENSO_*).
 */
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

export function documensoApiBaseUrl(): string {
  const raw = process.env.DOCUMENSO_API_URL?.trim();
  if (!raw) {
    throw new Error(
      "Assinatura Documento: defina DOCUMENSO_API_URL apontando para a sua instância (self-host)."
    );
  }
  return raw.replace(/\/+$/, "");
}

export function documensoConfigurado(): boolean {
  return Boolean(
    process.env.DOCUMENSO_API_TOKEN?.trim() &&
      process.env.DOCUMENSO_API_URL?.trim()
  );
}

function apiToken(): string {
  const t = process.env.DOCUMENSO_API_TOKEN?.trim();
  if (!t) {
    throw new Error(
        "Provedor Documento não configurado. Defina DOCUMENSO_API_TOKEN no servidor."
    );
  }
  return t;
}

function authHeaders(json = false): HeadersInit {
  const h: Record<string, string> = {
    Authorization: apiToken(),
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export type DocumensoRecipientInput = {
  email: string;
  name: string;
  role?: "SIGNER" | "APPROVER" | "CC" | "VIEWER";
};

export type DocumensoCreateEnvelopeInput = {
  title: string;
  pdfBytes: Uint8Array;
  fileName: string;
  recipients: DocumensoRecipientInput[];
  externalId?: string;
};

export type DocumensoEnvelopeSummary = {
  id: string;
  status?: string;
  title?: string;
  envelopeItems?: Array<{ id: string }>;
  recipients?: Array<{
    id?: number | string;
    email?: string;
    signingUrl?: string;
    signingStatus?: string;
  }>;
};

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string; message?: string };
    return j.error || j.message || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export class DocumensoProvider implements SignatureProvider {
  readonly code = "documento";
  readonly name = "Documento";

  async authorize(
    input: SignatureAuthorizeInput
  ): Promise<SignatureAuthorizeResult> {
    const base = documensoApiBaseUrl().replace(/\/api\/v2$/, "");
    const state = input.state || crypto.randomUUID();
    return {
      authorizationUrl: `${base}/`,
      state,
    };
  }

  async createAndDistribute(
    input: DocumensoCreateEnvelopeInput
  ): Promise<DocumensoEnvelopeSummary> {
    const envelope = await this.createEnvelope(input);
    await this.distribute(envelope.id);
    return envelope;
  }

  async createEnvelope(
    input: DocumensoCreateEnvelopeInput
  ): Promise<DocumensoEnvelopeSummary> {
    if (!input.recipients.length) {
      throw new Error("Informe ao menos um signatário (e-mail e nome).");
    }

    const recipients = input.recipients.map((r, idx) => ({
      email: r.email.trim().toLowerCase(),
      name: (r.name || r.email).trim(),
      role: r.role || "SIGNER",
      fields:
        (r.role || "SIGNER") === "SIGNER"
          ? [
              {
                identifier: 0,
                type: "SIGNATURE",
                page: 1,
                positionX: 10 + idx * 2,
                positionY: 80,
                width: 30,
                height: 5,
              },
              {
                identifier: 0,
                type: "DATE",
                page: 1,
                positionX: 50,
                positionY: 80,
                width: 20,
                height: 3,
              },
            ]
          : [],
    }));

    const form = new FormData();
    form.append(
      "payload",
      JSON.stringify({
        type: "DOCUMENT",
        title: input.title,
        externalId: input.externalId || undefined,
        recipients,
      })
    );
    form.append(
      "files",
      new Blob([Buffer.from(input.pdfBytes)], { type: "application/pdf" }),
      input.fileName.endsWith(".pdf") ? input.fileName : `${input.fileName}.pdf`
    );

    const res = await fetch(`${documensoApiBaseUrl()}/envelope/create`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Assinatura Documento — criar envelope: ${await parseError(res)}`);
    }
    return (await res.json()) as DocumensoEnvelopeSummary;
  }

  async distribute(envelopeId: string): Promise<void> {
    const res = await fetch(
      `${documensoApiBaseUrl()}/envelope/${encodeURIComponent(envelopeId)}/distribute`,
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({}),
      }
    );
    if (!res.ok) {
      throw new Error(`Assinatura Documento — enviar: ${await parseError(res)}`);
    }
  }

  async getEnvelope(envelopeId: string): Promise<DocumensoEnvelopeSummary> {
    const res = await fetch(
      `${documensoApiBaseUrl()}/envelope/${encodeURIComponent(envelopeId)}`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      throw new Error(`Assinatura Documento — obter: ${await parseError(res)}`);
    }
    return (await res.json()) as DocumensoEnvelopeSummary;
  }

  async downloadSignedPdf(envelopeId: string): Promise<Buffer> {
    const envelope = await this.getEnvelope(envelopeId);
    const status = (envelope.status || "").toUpperCase();
    if (status && status !== "COMPLETED") {
      throw new Error(
        `Envelope ainda não concluído (status: ${envelope.status}).`
      );
    }
    const itemId = envelope.envelopeItems?.[0]?.id;
    if (!itemId) {
      throw new Error("Envelope sem itens para download.");
    }
    const res = await fetch(
      `${documensoApiBaseUrl()}/envelope/item/${encodeURIComponent(itemId)}/download?version=signed`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      // Algumas versões devolvem JSON com downloadUrl
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = (await res.json()) as { downloadUrl?: string };
        if (j.downloadUrl) {
          const dl = await fetch(j.downloadUrl);
          if (!dl.ok) {
            throw new Error("Falha ao baixar PDF assinado (URL temporária).");
          }
          return Buffer.from(await dl.arrayBuffer());
        }
      }
      throw new Error(`Assinatura Documento — download: ${await parseError(res)}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = (await res.json()) as { downloadUrl?: string };
      if (!j.downloadUrl) {
        throw new Error("Resposta de download sem downloadUrl.");
      }
      const dl = await fetch(j.downloadUrl);
      if (!dl.ok) {
        throw new Error("Falha ao baixar PDF assinado (URL temporária).");
      }
      return Buffer.from(await dl.arrayBuffer());
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async sign(input: SignatureSignInput): Promise<SignatureSignResult> {
    return {
      externalId: input.sessionId || input.documentId,
      status: "pending_external",
    };
  }

  async batchSign(
    input: SignatureBatchSignInput
  ): Promise<SignatureBatchSignResult> {
    return {
      externalSessionId: input.batchId,
      items: input.items.map((i) => ({
        documentId: i.documentId,
        status: "unsupported",
        error: "Lote: envie um envelope por documento.",
      })),
    };
  }

  async verify(_input: SignatureVerifyInput): Promise<SignatureVerifyResult> {
    return {
      valid: false,
      detail:
        "Validação fica no motor de assinatura / leitor PDF. Use o PDF assinado armazenado.",
    };
  }

  async cancel(externalId: string): Promise<SignatureStatusResult> {
    return {
      status: "cancelled_local",
      detail: `Cancele o envelope ${externalId} no painel de assinatura se necessário.`,
    };
  }

  async status(externalId: string): Promise<SignatureStatusResult> {
    if (!documensoConfigurado()) {
      return {
        status: "unavailable",
        detail: "Credenciais DOCUMENSO_* ausentes.",
      };
    }
    try {
      const env = await this.getEnvelope(externalId);
      return {
        status: (env.status || "unknown").toLowerCase(),
        detail: env.title,
      };
    } catch (err) {
      return {
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
