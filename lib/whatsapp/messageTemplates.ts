import type { MenuOptionId } from "./types";
import { MENU_OPTIONS } from "./botMenu";

export function getSiteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

function url(path: string): string {
  return `${getSiteBaseUrl()}${path}`;
}

export const COPY = {
  greeting: [
    "Olá! Você está no canal oficial do *Instituto Paulista de Esporte, Cultura e Cidadania (IPECC)*.",
    "Posso orientar sobre projetos, editais, propostas, transparência e eventos.",
  ],
  greetingFromSite: [
    "Recebemos sua mensagem pelo site do IPECC. Obrigado pelo contato!",
    "Escolha uma opção abaixo para seguir:",
  ],
  unknown: (n: number) =>
    n >= 2
      ? [
          "Ainda não identifiquei sua solicitação.",
          "Digite *menu* para ver as opções ou *6* para falar com a equipe.",
        ]
      : [
          "Não identifiquei sua solicitação.",
          "Digite *menu* para ver as opções ou *6* para falar com a equipe.",
        ],
  handoff: [
    "Encaminhamos sua mensagem para nossa equipe.",
    "O retorno ocorre em *horário comercial* (segunda a sexta).",
    "Se for urgente sobre edital com prazo hoje, informe o *nome do edital* na próxima mensagem.",
    "Enquanto isso, o atendimento automático fica pausado.",
  ],
  closed: [
    "Obrigado pelo contato com o IPECC.",
    `Site: ${url("/")}`,
    "Até breve!",
  ],
};

const TOPIC_COPY: Record<
  Exclude<MenuOptionId, "equipe">,
  { lines: string[]; state: import("./types").ConversationState }
> = {
  projetos: {
    state: "topic_projetos",
    lines: [
      "O IPECC desenvolve ações em *educação, cultura e cidadania* em parceria com escolas, comunidades e poder público.",
      `Saiba mais: ${url("/projetos")}`,
      "Para voltar ao menu, digite *menu*.",
    ],
  },
  editais: {
    state: "topic_editais",
    lines: [
      "Consulte editais e chamadas públicas:",
      url("/editais"),
      "A documentação exigida está descrita em cada edital.",
      "Para voltar ao menu, digite *menu*.",
    ],
  },
  propostas: {
    state: "topic_propostas",
    lines: [
      "O envio de propostas é feito pelo formulário oficial:",
      url("/propostas"),
      "Tenha em mãos a documentação do edital antes de enviar.",
      "Dúvidas complexas: opção *6* no menu.",
    ],
  },
  transparencia: {
    state: "topic_transparencia",
    lines: [
      "Acesse documentos, parcerias e prestação de contas:",
      url("/transparencia"),
      "Compromisso com publicidade e controle social.",
      "Para voltar ao menu, digite *menu*.",
    ],
  },
  eventos: {
    state: "topic_eventos",
    lines: [
      "Confira a agenda de eventos:",
      url("/eventos"),
      "Para voltar ao menu, digite *menu*.",
    ],
  },
};

export function topicReply(optionId: MenuOptionId): {
  lines: string[];
  nextState: import("./types").ConversationState;
} {
  if (optionId === "equipe") {
    return { lines: COPY.handoff, nextState: "handoff" };
  }
  const t = TOPIC_COPY[optionId];
  return { lines: t.lines, nextState: t.state };
}