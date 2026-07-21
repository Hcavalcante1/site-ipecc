import type { MenuOptionId } from "./types";
import {
  TOPIC_SCRIPTS,
  topicSubmenuLines,
  type TopicScript,
} from "./botTopicScripts";
import { getPublicSiteUrl } from "@/lib/seo";

export function getSiteBaseUrl(): string {
  return getPublicSiteUrl();
}

function url(path: string): string {
  return `${getSiteBaseUrl()}${path}`;
}

export const COPY = {
  greeting: [
    "Olá! Você está no canal oficial do *Instituto Paulista de Esporte, Cultura e Cidadania (IPECC)*.",
    "Nossa atuação: *educação, esporte, cultura e cidadania* — com projetos de impacto social, parcerias públicas e transparência ativa no Estado de São Paulo.",
    "Em números (visão institucional): *+120* projetos · *35* municípios · *50.000+* pessoas · *300+* parceiros.",
    "Neste assistente você encontra o *mesmo escopo do site*: projetos e programas, editais, envio de propostas, transparência e eventos.",
    "Use o *menu 1–6*. Em cada tema, digite *A*, *B* ou *C* para aprofundar. Digite *6* para falar com a equipe humana.",
  ],
  greetingFromSite: [
    "Recebemos seu contato pelo *site oficial do IPECC*. Obrigado!",
    "Somos o *Instituto Paulista de Esporte, Cultura e Cidadania* — educação, esporte, cultura e cidadania.",
    "O portal conecta *projetos*, *editais*, *propostas documentais* e *transparência* para poder público, OSCs, escolas e comunidade.",
    "Impacto institucional: *+120* projetos · *35* municípios · *50.000+* pessoas · *300+* parceiros.",
    `Explore também: ${url("/")} · notícias e vitrine: ${url("/inicio")}`,
    "Escolha uma opção do menu. Em cada tema use *A*, *B* ou *C*. Digite *6* para a equipe.",
  ],
  unknown: (n: number) =>
    n >= 2
      ? [
          "Ainda não identifiquei sua solicitação com clareza.",
          "Você pode:",
          "• digitar *menu* para ver todas as opções do portal;",
          "• se já estiver em um tema, usar *A*, *B* ou *C*;",
          "• digitar *6* para falar com a equipe (útil se for edital com prazo ou caso específico).",
          "Posso orientar sobre projetos, editais, propostas, transparência e eventos — o mesmo escopo do site público.",
        ]
      : [
          "Não identifiquei sua solicitação.",
          "Digite *menu* para ver as opções do assistente (projetos, editais, propostas, transparência, eventos) ou *6* para falar com a equipe do IPECC.",
        ],
  handoff: [
    "Vamos encaminhar você para a *equipe humana do IPECC*.",
    "O retorno ocorre em *horário comercial* (segunda a sexta).",
    "Para agilizar, informe na mensagem: *assunto*, *nome do edital* (se houver), *protocolo* (se já enviou proposta) ou *nome/data do evento*.",
    "Dados institucionais: *CNPJ 05.965.225/0001-04*.",
    `Contato e canais: ${url("/contato")}`,
    "Enquanto isso, o atendimento automático fica pausado — digite *menu* se quiser voltar ao assistente.",
  ],
  closed: [
    "Obrigado pelo contato com o *IPECC* — Instituto Paulista de Esporte, Cultura e Cidadania.",
    `Portal: ${url("/")} · Transparência: ${url("/transparencia")} · Contato: ${url("/contato")}`,
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
