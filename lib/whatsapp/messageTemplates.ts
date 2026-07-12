import type { MenuOptionId } from "./types";
import {
  TOPIC_SCRIPTS,
  topicSubmenuLines,
  type TopicScript,
} from "./botTopicScripts";

export function getSiteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function url(path: string): string {
  return `${getSiteBaseUrl()}${path}`;
}

export const COPY = {
  greeting: [
    "Olá! Você está no canal oficial do *Instituto Paulista de Esporte, Cultura e Cidadania (IPECC)*.",
    "Posso orientar sobre projetos, editais, propostas, transparência e eventos — com menu e *subopções A/B/C* em cada tema.",
  ],
  greetingFromSite: [
    "Recebemos sua mensagem pelo site do IPECC. Obrigado pelo contato!",
    "Escolha uma opção do menu. Em cada tema, use *A*, *B* ou *C* para ir mais a fundo.",
  ],
  unknown: (n: number) =>
    n >= 2
      ? [
          "Ainda não identifiquei sua solicitação.",
          "Digite *menu* para ver as opções, *A/B/C* se estiver em um tema, ou *6* para falar com a equipe.",
        ]
      : [
          "Não identifiquei sua solicitação.",
          "Digite *menu* para ver as opções ou *6* para falar com a equipe.",
        ],
  handoff: [
    "Vamos encaminhar você para a *equipe humana*.",
    "O retorno ocorre em *horário comercial* (segunda a sexta).",
    "Se for urgente sobre edital com prazo hoje, informe o *nome do edital* na mensagem do WhatsApp.",
    "Enquanto isso, o atendimento automático fica pausado — digite *menu* se quiser voltar ao bot.",
  ],
  closed: [
    "Obrigado pelo contato com o IPECC.",
    `Site: ${url("/")}`,
    "Até breve!",
  ],
};

export function getTopicScript(
  optionId: Exclude<MenuOptionId, "equipe">
): TopicScript {
  return TOPIC_SCRIPTS[optionId];
}

/** Resposta ao entrar em um tema (intro + submenu A/B/C). */
export function topicReply(optionId: MenuOptionId): {
  lines: string[];
  nextState: import("./types").ConversationState;
} {
  if (optionId === "equipe") {
    return { lines: COPY.handoff, nextState: "handoff" };
  }
  const script = TOPIC_SCRIPTS[optionId];
  return {
    lines: topicSubmenuLines(script),
    nextState: script.state,
  };
}
