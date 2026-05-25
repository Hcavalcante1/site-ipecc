import { menuPromptLines, resolveMenuOption } from "./botMenu";
import { COPY, topicReply } from "./messageTemplates";
import { isFromSiteMessage, normalizeInboundText } from "./textUtils";
import type {
  BotTurnResult,
  ConversationContext,
  ConversationState,
  InboundMessage,
  OutboundMessage,
} from "./types";

const MENU_COMMANDS = new Set([
  "menu",
  "inicio",
  "início",
  "ajuda",
  "voltar",
]);

const EXIT_COMMANDS = new Set(["sair", "encerrar", "tchau", "obrigado"]);

const HANDOFF_COMMANDS = new Set([
  "atendente",
  "humano",
  "equipe",
  "pessoa",
  "falar com a equipe",
]);

function normalizeText(text: string): string {
  return normalizeInboundText(text);
}

function isFromSite(text: string): boolean {
  return isFromSiteMessage(text);
}

function toReplies(lines: string[]): OutboundMessage[] {
  return [{ text: lines.join("\n\n") }];
}

function showMenu(): BotTurnResult {
  return {
    replies: toReplies([...menuPromptLines()]),
    nextState: "menu",
  };
}

function showGreeting(fromSite: boolean): BotTurnResult {
  const intro = fromSite ? COPY.greetingFromSite : COPY.greeting;
  return {
    replies: toReplies([...intro, "", ...menuPromptLines()]),
    nextState: "menu",
  };
}

function handoff(): BotTurnResult {
  return {
    replies: toReplies(COPY.handoff),
    nextState: "handoff",
    handoff: true,
  };
}

/** Processa uma mensagem inbound e retorna respostas + novo estado (função pura). */
export function processBotTurn(
  ctx: ConversationContext,
  inbound: InboundMessage
): BotTurnResult {
  const text = inbound.text?.trim() || "";
  const lower = normalizeText(text);

  if (ctx.state === "handoff") {
    if (EXIT_COMMANDS.has(lower)) {
      return { replies: toReplies(COPY.closed), nextState: "closed" };
    }
    if (MENU_COMMANDS.has(lower) || lower === "bot") {
      return showMenu();
    }
    return {
      replies: toReplies([
        "Sua conversa está com a equipe. Aguarde o retorno em horário comercial.",
        "Digite *menu* se quiser ver as opções automáticas novamente.",
      ]),
      nextState: "handoff",
    };
  }

  if (ctx.state === "closed") {
    if (EXIT_COMMANDS.has(lower)) {
      return showGreeting(inbound.fromSite ?? isFromSite(text));
    }
    return showGreeting(inbound.fromSite ?? isFromSite(text));
  }

  if (EXIT_COMMANDS.has(lower)) {
    return { replies: toReplies(COPY.closed), nextState: "closed" };
  }

  if (HANDOFF_COMMANDS.has(lower) || lower === "6") {
    return handoff();
  }

  if (MENU_COMMANDS.has(lower)) {
    return showMenu();
  }

  const option = resolveMenuOption(text);
  if (option) {
    const { lines, nextState } = topicReply(option.id);
    return { replies: toReplies(lines), nextState };
  }

  const isGreeting =
    !text ||
    ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "hello", "hi"].includes(
      lower
    );

  if (ctx.state === "idle") {
    if (isGreeting) {
      return showGreeting(
        inbound.fromSite ?? ctx.fromSiteHint ?? isFromSite(text)
      );
    }
    return showMenu();
  }

  if (isGreeting) {
    return showGreeting(
      inbound.fromSite ?? ctx.fromSiteHint ?? isFromSite(text)
    );
  }

  const topicStates: ConversationState[] = [
    "topic_projetos",
    "topic_editais",
    "topic_propostas",
    "topic_transparencia",
    "topic_eventos",
    "menu",
  ];
  if (topicStates.includes(ctx.state)) {
    return showMenu();
  }

  const unknownCount = ctx.unknownCount + 1;
  if (unknownCount >= 3) {
    const h = handoff();
    return { ...h, replies: toReplies([...COPY.unknown(unknownCount), "", ...COPY.handoff]) };
  }

  return {
    replies: toReplies(COPY.unknown(unknownCount)),
    nextState: ctx.state,
  };
}

export function createInitialContext(waId: string): ConversationContext {
  return {
    waId,
    state: "idle",
    unknownCount: 0,
  };
}

export function applyTurn(
  ctx: ConversationContext,
  inbound: InboundMessage
): { ctx: ConversationContext; result: BotTurnResult } {
  const result = processBotTurn(ctx, inbound);
  const understood =
    resolveMenuOption(inbound.text) ||
    MENU_COMMANDS.has(normalizeText(inbound.text)) ||
    ["oi", "olá", "ola"].includes(normalizeText(inbound.text)) ||
    isFromSite(inbound.text);

  return {
    result,
    ctx: {
      ...ctx,
      state: result.nextState,
      unknownCount: understood ? 0 : ctx.unknownCount + 1,
      fromSiteHint: ctx.fromSiteHint || inbound.fromSite || isFromSite(inbound.text),
    },
  };
}
