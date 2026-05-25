import { SITE_WHATSAPP_DEFAULT_MESSAGE } from "./publicWhatsApp";

export function normalizeInboundText(text: string): string {
  return text.trim().toLowerCase();
}

export function isFromSiteMessage(text: string): boolean {
  const t = normalizeInboundText(text);
  return (
    t.includes("vim pelo site") ||
    t.includes(normalizeInboundText(SITE_WHATSAPP_DEFAULT_MESSAGE).slice(0, 24))
  );
}
