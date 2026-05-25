import { parseMetaWebhookPayload } from "./parseWebhook";
import { verifyMetaWebhookSignature } from "./verifySignature";
import { handleInboundMessage } from "./handleInbound";
import { logWhatsApp } from "./logWhatsApp";

export type WebhookPostSuccess = {
  ok: true;
  status: 200;
  processed: number;
  results: Awaited<ReturnType<typeof handleInboundMessage>>[];
};

export type WebhookPostFailure = {
  ok: false;
  status: 503 | 401 | 400;
  reason?: "whatsapp_not_configured";
  error?: string;
};

export type WebhookPostResult = WebhookPostSuccess | WebhookPostFailure;

/**
 * Lógica compartilhada do POST /api/whatsapp/webhook (testável sem Next).
 */
export async function processWebhookPost(
  rawBody: string,
  signature: string | null,
  appSecret: string | undefined
): Promise<WebhookPostResult> {
  const secret = appSecret?.trim();

  if (!secret) {
    return { ok: false, status: 503, reason: "whatsapp_not_configured" };
  }

  if (!verifyMetaWebhookSignature(rawBody, signature, secret)) {
    logWhatsApp("webhook_invalid_signature", {});
    return { ok: false, status: 401, error: "Invalid signature" };
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }

  const messages = parseMetaWebhookPayload(
    body as Parameters<typeof parseMetaWebhookPayload>[0]
  );

  const results = [];
  for (const inbound of messages) {
    results.push(await handleInboundMessage(inbound));
  }

  logWhatsApp("webhook_post", { count: messages.length });

  return {
    ok: true,
    status: 200,
    processed: messages.length,
    results,
  };
}
