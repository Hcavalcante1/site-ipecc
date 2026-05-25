/**
 * Links públicos wa.me — número institucional via env (sem token de API).
 */

/** Mensagem padrão ao abrir WhatsApp pelo site (menu / redes). */
export const SITE_WHATSAPP_DEFAULT_MESSAGE =
  "Olá, vim pelo site do IPECC e gostaria de atendimento.";

/** Opções de assunto do pré-cadastro (painel flutuante). */
export type PublicWhatsAppSubjectId =
  | "projetos"
  | "editais"
  | "propostas"
  | "transparencia"
  | "eventos"
  | "equipe"
  | "outro";

export type PublicWhatsAppSubjectOption = {
  id: PublicWhatsAppSubjectId;
  label: string;
};

export const PUBLIC_WHATSAPP_SUBJECT_OPTIONS: PublicWhatsAppSubjectOption[] =
  [
    { id: "projetos", label: "Projetos" },
    { id: "editais", label: "Editais" },
    { id: "propostas", label: "Propostas" },
    { id: "transparencia", label: "Transparência" },
    { id: "eventos", label: "Eventos" },
    { id: "equipe", label: "Falar com a equipe" },
    { id: "outro", label: "Outro" },
  ];

/** @deprecated Use PUBLIC_WHATSAPP_SUBJECT_OPTIONS — mantido para scripts legados. */
export type PublicWhatsAppChatOption = {
  id: Exclude<PublicWhatsAppSubjectId, "outro">;
  label: string;
  message: string;
};

/** @deprecated Mensagens rápidas antigas; pré-cadastro usa formatWhatsAppLeadMessage. */
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

export type WhatsAppLeadFormFields = {
  nome: string;
  organizacao: string;
  telefone: string;
  email: string;
  assunto: string;
  mensagem: string;
};

export type WhatsAppLeadValidation = {
  ok: boolean;
  errors: Partial<Record<keyof WhatsAppLeadFormFields, string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** URLs que devem abrir o pré-cadastro em vez de navegar direto. */
export function isWhatsAppLeadHref(href: string): boolean {
  const u = href.trim().toLowerCase();
  if (!u) return false;
  if (
    u.includes("wa.me") ||
    u.includes("whatsapp.com") ||
    u.includes("api.whatsapp.com")
  ) {
    return true;
  }
  return u === "/contato" || u.endsWith("/contato");
}

export function getWhatsAppSubjectLabel(assuntoId: string): string {
  const fromList = PUBLIC_WHATSAPP_SUBJECT_OPTIONS.find(
    (o) => o.id === assuntoId
  )?.label;
  return fromList ?? (assuntoId.trim() || "—");
}

export function formatWhatsAppLeadMessage(
  data: WhatsAppLeadFormFields
): string {
  const assunto = getWhatsAppSubjectLabel(data.assunto);
  const org = data.organizacao.trim() || "—";
  const email = data.email.trim() || "—";
  const msg = data.mensagem.trim() || "—";

  return [
    "Olá, vim pelo site do IPECC.",
    "",
    `Nome: ${data.nome.trim()}`,
    `Organização: ${org}`,
    `Telefone: ${data.telefone.trim()}`,
    `E-mail: ${email}`,
    `Assunto: ${assunto}`,
    `Mensagem: ${msg}`,
  ].join("\n");
}

export function validateWhatsAppLeadForm(
  data: WhatsAppLeadFormFields
): WhatsAppLeadValidation {
  const errors: WhatsAppLeadValidation["errors"] = {};

  if (!data.nome.trim()) {
    errors.nome = "Informe seu nome.";
  }
  if (!data.telefone.trim()) {
    errors.telefone = "Informe um telefone.";
  }
  if (!data.assunto.trim()) {
    errors.assunto = "Selecione um assunto.";
  } else if (
    !PUBLIC_WHATSAPP_SUBJECT_OPTIONS.some((o) => o.id === data.assunto)
  ) {
    errors.assunto = "Assunto inválido.";
  }
  if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) {
    errors.email = "E-mail inválido.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function buildWhatsAppUrlFromLead(
  data: WhatsAppLeadFormFields
): string {
  return buildWhatsAppUrl({ message: formatWhatsAppLeadMessage(data) });
}

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
