import { menuPromptLines, resolveMenuOption } from "./botMenu";
import { COPY, topicReply } from "./messageTemplates";
import {
  TOPIC_SCRIPTS,
  findTopicSubByLabel,
  resolveTopicSubKey,
  topicStateToId,
  topicSubmenuLines,
} from "./botTopicScripts";
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
  "0",
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

function handleTopicTurn(
  state: ConversationState,
  text: string,
  lower: string
): BotTurnResult | null {
  const id = topicStateToId(state);
  if (!id) return null;
  const script = TOPIC_SCRIPTS[id];

  if (lower === "0" || MENU_COMMANDS.has(lower)) {
    return showMenu();
  }

  const subKey = resolveTopicSubKey(text);
  if (subKey) {
    const sub = script.subs.find((s) => s.key === subKey);
    if (sub) {
      return {
        replies: toReplies(sub.lines),
        nextState: script.state,
      };
    }
  }

  const byLabel = findTopicSubByLabel(script, text);
  if (byLabel) {
    return {
      replies: toReplies(byLabel.lines),
      nextState: script.state,
    };
  }

  return null;
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
    return showGreeting(inbound.fromSite ?? isFromSite(text));
  }

  if (EXIT_COMMANDS.has(lower)) {
    return { replies: toReplies(COPY.closed), nextState: "closed" };
  }

  if (HANDOFF_COMMANDS.has(lower) || lower === "6") {
    return handoff();
  }

  // Dentro de um tema: prioriza A/B/C antes do menu principal 1–5
  const topicHandled = handleTopicTurn(ctx.state, text, lower);
  if (topicHandled) {
    return topicHandled;
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

  // Em tema sem match: reexibe submenu do tema (mais profundo que saltar ao menu)
  const topicId = topicStateToId(ctx.state);
  if (topicId) {
    const script = TOPIC_SCRIPTS[topicId];
    return {
      replies: toReplies([
        "Neste tema, use *A*, *B* ou *C* (ou *0* para o menu principal).",
        ...topicSubmenuLines(script),
      ]),
      nextState: script.state,
    };
  }

  if (ctx.state === "menu") {
    return {
      replies: toReplies([
        ...COPY.unknown(ctx.unknownCount + 1),
        "",
        ...menuPromptLines(),
      ]),
      nextState: "menu",
    };
  }

  const unknownCount = ctx.unknownCount + 1;
  if (unknownCount >= 3) {
    const h = handoff();
    return {
      ...h,
      replies: toReplies([...COPY.unknown(unknownCount), "", ...COPY.handoff]),
    };
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
  const lower = normalizeText(inbound.text);
  const understood = Boolean(
    resolveMenuOption(inbound.text) ||
      resolveTopicSubKey(inbound.text) ||
      MENU_COMMANDS.has(lower) ||
      HANDOFF_COMMANDS.has(lower) ||
      EXIT_COMMANDS.has(lower) ||
      ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "hello", "hi"].includes(
        lower
      ) ||
      isFromSite(inbound.text)
  );

  return {
    result,
    ctx: {
      ...ctx,
      state: result.nextState,
      unknownCount: understood ? 0 : ctx.unknownCount + 1,
      fromSiteHint:
        ctx.fromSiteHint || inbound.fromSite || isFromSite(inbound.text),
    },
  };
}
