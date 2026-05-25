/**
 * Links públicos wa.me — número institucional via env (sem token de API).
 */

/** Mensagem padrão ao abrir WhatsApp pelo site (menu / redes). */
export const SITE_WHATSAPP_DEFAULT_MESSAGE =
  "Olá, vim pelo site do IPECC e gostaria de atendimento.";

const FALLBACK_NUMBER = "5511943312119";

export function normalizeWhatsAppNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function getSiteWhatsAppNumber(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  return normalizeWhatsAppNumber(fromEnv || FALLBACK_NUMBER);
}

export type WhatsAppLinkOptions = {
  /** Apenas dígitos (E.164 sem +). Se omitido, usa número institucional do site. */
  number?: string;
  message?: string;
};

/** Monta URL wa.me com texto pré-preenchido (seguro para href em <a>). */
export function buildWhatsAppUrl(options: WhatsAppLinkOptions = {}): string {
  const number = options.number
    ? normalizeWhatsAppNumber(options.number)
    : getSiteWhatsAppNumber();

  if (!number) {
    return "https://wa.me/";
  }

  const message = options.message ?? SITE_WHATSAPP_DEFAULT_MESSAGE;
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${number}?${params.toString()}`;
}
