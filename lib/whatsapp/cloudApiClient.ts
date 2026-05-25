import { getWhatsAppApiVersion, isWhatsAppDryRun } from "./config";
import { logWhatsApp } from "./logWhatsApp";

export type SendTextResult = {
  sent: boolean;
  dryRun: boolean;
  messageId?: string;
  error?: string;
};

export async function sendWhatsAppText(
  toWaId: string,
  text: string
): Promise<SendTextResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (isWhatsAppDryRun() || !token || !phoneNumberId) {
    logWhatsApp("send_dry_run", {
      to: toWaId,
      preview: text.slice(0, 120),
    });
    return { sent: false, dryRun: true };
  }

  const version = getWhatsAppApiVersion();
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWaId,
        type: "text",
        text: { body: text },
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      const err = json.error?.message || res.statusText;
      logWhatsApp("send_error", { to: toWaId, status: res.status, err });
      return { sent: false, dryRun: false, error: err };
    }

    const messageId = json.messages?.[0]?.id;
    logWhatsApp("send_ok", { to: toWaId, messageId });
    return { sent: true, dryRun: false, messageId };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    logWhatsApp("send_exception", { to: toWaId, err });
    return { sent: false, dryRun: false, error: err };
  }
}
