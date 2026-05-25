import { createHmac, timingSafeEqual } from "crypto";

/**
 * Valida X-Hub-Signature-256 da Meta (server-only).
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export function verifyMetaWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const received = signatureHeader.slice("sha256=".length);

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
