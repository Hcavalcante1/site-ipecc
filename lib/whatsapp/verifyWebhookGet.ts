export type WebhookVerifyGetInput = {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  verifyToken: string | undefined;
};

export type WebhookVerifyGetResult =
  | { ok: true; challenge: string }
  | { ok: false; reason: "missing_config" | "forbidden" };

/**
 * Handshake GET da Meta (hub.mode=subscribe).
 */
export function verifyMetaWebhookGet(
  input: WebhookVerifyGetInput
): WebhookVerifyGetResult {
  const expected = input.verifyToken?.trim();

  if (
    input.mode === "subscribe" &&
    expected &&
    input.token === expected &&
    input.challenge
  ) {
    return { ok: true, challenge: input.challenge };
  }

  if (!expected) {
    return { ok: false, reason: "missing_config" };
  }

  return { ok: false, reason: "forbidden" };
}
