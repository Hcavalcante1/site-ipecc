/** Estados do motor de conversa (domínio IPECC, independente da Meta). */
export type ConversationState =
  | "idle"
  | "menu"
  | "topic_projetos"
  | "topic_editais"
  | "topic_propostas"
  | "topic_transparencia"
  | "topic_eventos"
  | "handoff"
  | "closed";

export type MenuOptionId =
  | "projetos"
  | "editais"
  | "propostas"
  | "transparencia"
  | "eventos"
  | "equipe";

export type InboundMessage = {
  waId: string;
  text: string;
  messageId?: string;
  fromSite?: boolean;
};

export type OutboundMessage = {
  text: string;
};

export type BotTurnResult = {
  replies: OutboundMessage[];
  nextState: ConversationState;
  handoff?: boolean;
};

export type ConversationContext = {
  waId: string;
  state: ConversationState;
  unknownCount: number;
  fromSiteHint?: boolean;
};
