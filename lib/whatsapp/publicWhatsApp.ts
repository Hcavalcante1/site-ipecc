/**
 * Links públicos wa.me — número institucional via env (sem token de API).
 */

/** Mensagem padrão ao abrir WhatsApp pelo site (menu / redes). */
export const SITE_WHATSAPP_DEFAULT_MESSAGE =
  "Olá, vim pelo site do IPECC e gostaria de atendimento.";

/** Opções do painel flutuante público (wa.me — sem Cloud API). */
export type PublicWhatsAppChatOption = {
  id:
    | "projetos"
    | "editais"
    | "propostas"
    | "transparencia"
    | "eventos"
    | "equipe";
  label: string;
  message: string;
};

export const PUBLIC_WHATSAPP_CHAT_OPTIONS: PublicWhatsAppChatOption[] = [
  {
    id: "projetos",
    label: "Projetos",
    message:
      "Olá, vim pelo site do IPECC e gostaria de informações sobre projetos.",
  },
  {
    id: "editais",
    label: "Editais",
    message: "Olá, gostaria de informações sobre editais.",
  },
  {
    id: "propostas",
    label: "Propostas",
    message: "Olá, gostaria de informações sobre envio de propostas.",
  },
  {
    id: "transparencia",
    label: "Transparência",
    message: "Olá, gostaria de informações sobre transparência.",
  },
  {
    id: "eventos",
    label: "Eventos",
    message: "Olá, gostaria de informações sobre eventos.",
  },
  {
    id: "equipe",
    label: "Falar com a equipe",
    message: "Olá, gostaria de falar com a equipe do IPECC.",
  },
];

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

export function getWhatsAppUrlForChatOption(
  optionId: PublicWhatsAppChatOption["id"]
): string {
  const option = PUBLIC_WHATSAPP_CHAT_OPTIONS.find((o) => o.id === optionId);
  return buildWhatsAppUrl({
    message: option?.message ?? SITE_WHATSAPP_DEFAULT_MESSAGE,
  });
}
