import type { ConversationState } from "./types";

export const CONVERSATION_STATE_LABELS: Record<ConversationState, string> = {
  idle: "Inativo",
  menu: "Menu principal",
  topic_projetos: "Tópico — Projetos",
  topic_editais: "Tópico — Editais",
  topic_propostas: "Tópico — Propostas",
  topic_transparencia: "Tópico — Transparência",
  topic_eventos: "Tópico — Eventos",
  handoff: "Aguardando equipe",
  closed: "Encerrada",
};

export function labelConversationState(state: string): string {
  return (
    CONVERSATION_STATE_LABELS[state as ConversationState] ?? state
  );
}

export function formatWaIdDisplay(waId: string): string {
  const digits = waId.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length >= 8) {
      return `+55 (${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
    }
  }
  return waId;
}
