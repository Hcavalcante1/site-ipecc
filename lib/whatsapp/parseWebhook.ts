import type { InboundMessage } from "./types";
import { isFromSiteMessage } from "./textUtils";

type MetaTextMessage = {
  from: string;
  id?: string;
  type?: string;
  text?: { body?: string };
};

type MetaChange = {
  value?: {
    messages?: MetaTextMessage[];
    contacts?: { wa_id?: string }[];
  };
};

type MetaWebhookBody = {
  entry?: { changes?: MetaChange[] }[];
};

/** Extrai mensagens de texto do payload Meta (formato Cloud API). */
export function parseMetaWebhookPayload(
  body: MetaWebhookBody
): InboundMessage[] {
  const out: InboundMessage[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        if (msg.type && msg.type !== "text") continue;
        const text = msg.text?.body?.trim();
        if (!text || !msg.from) continue;
        out.push({
          waId: msg.from,
          text,
          messageId: msg.id,
          fromSite: isFromSiteMessage(text),
        });
      }
    }
  }

  return out;
}
