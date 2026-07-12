import type { ConversationState, MenuOptionId } from "./types";

function siteBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function url(path: string): string {
  return `${siteBase()}${path}`;
}

export type TopicSubKey = "a" | "b" | "c";

export type TopicSubOption = {
  key: TopicSubKey;
  label: string;
  lines: string[];
};

export type TopicScript = {
  id: Exclude<MenuOptionId, "equipe">;
  state: ConversationState;
  intro: string[];
  subs: TopicSubOption[];
};

/** Scripts profundos por tema (site + futuro WhatsApp Meta). */
export const TOPIC_SCRIPTS: Record<
  Exclude<MenuOptionId, "equipe">,
  TopicScript
> = {
  projetos: {
    id: "projetos",
    state: "topic_projetos",
    intro: [
      "*Projetos do IPECC*",
      "Atuamos em *educação, cultura, esporte e cidadania*, com escolas, comunidades e poder público.",
      `Visão geral: ${url("/projetos")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "O que o IPECC desenvolve",
        lines: [
          "Desenvolvemos *programas e projetos* alinhados à missão do Instituto: formação, cultura, esporte e cidadania.",
          "Cada projeto tem objetivos, público-alvo e parceiros descritos na página pública.",
          `Ver projetos: ${url("/projetos")}`,
          "Digite *B* ou *C* para continuar neste tema, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Como acompanhar um projeto",
        lines: [
          "No site você encontra a listagem e a página de detalhe de cada projeto (quando publicado).",
          "Para prestação de contas e documentos oficiais, use também a área de *Transparência* (opção *4* no menu).",
          `Projetos: ${url("/projetos")}`,
          `Transparência: ${url("/transparencia")}`,
          "Digite *0* para o menu ou *6* para falar com a equipe.",
        ],
      },
      {
        key: "c",
        label: "Parcerias e escolas",
        lines: [
          "Parcerias com escolas e instituições seguem o fluxo formal do IPECC (editais, convênios ou contato institucional).",
          "Se busca *participar de chamada pública*, use *Editais* (opção *2*) e *Enviar proposta* (opção *3*).",
          "Para conversar com a equipe sobre parceria: digite *6*.",
          `Editais: ${url("/editais")}`,
        ],
      },
    ],
  },
  editais: {
    id: "editais",
    state: "topic_editais",
    intro: [
      "*Editais e chamadas públicas*",
      "Aqui ficam as oportunidades oficiais para participação de instituições e parceiros.",
      `Lista de editais: ${url("/editais")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "Ver editais publicados",
        lines: [
          "Consulte os editais e chamadas na página oficial. Cada item traz objeto, prazos e documentos.",
          `Abrir editais: ${url("/editais")}`,
          "Atenção: *leia o edital completo* antes de preparar a proposta.",
          "Digite *B* para saber como participar, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Como participar",
        lines: [
          "1) Abra o edital de interesse e leia o *regulamento* e os *anexos*.",
          "2) Separe a documentação exigida (conforme o edital).",
          "3) Envie a proposta pelo formulário oficial (opção *3* — Enviar proposta).",
          `Editais: ${url("/editais")}`,
          `Propostas: ${url("/propostas")}`,
          "Dúvida específica de um edital: digite *6* e informe o *nome do edital*.",
        ],
      },
      {
        key: "c",
        label: "Prazos e documentos",
        lines: [
          "Prazos, checklist e modelos de documentos estão *dentro de cada edital*.",
          "Não há um prazo único para todos — sempre confira a publicação do edital escolhido.",
          "Se o prazo for *hoje* ou houver risco de perda de prazo, digite *6* e mencione o edital com urgência.",
          `Editais: ${url("/editais")}`,
        ],
      },
    ],
  },
  propostas: {
    id: "propostas",
    state: "topic_propostas",
    intro: [
      "*Envio de propostas*",
      "O canal oficial de envio é o formulário do site (não substituímos o fluxo por mensagem).",
      `Formulário: ${url("/propostas")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "Passo a passo do envio",
        lines: [
          "1) Identifique o *edital* correspondente.",
          "2) Reúna anexos e dados pedidos no edital.",
          "3) Preencha o formulário em *Propostas* e envie.",
          "4) Guarde o comprovante/protocolo gerado (quando houver).",
          `Abrir formulário: ${url("/propostas")}`,
          "Digite *B* para documentos comuns, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Documentos e anexos",
        lines: [
          "Os anexos *variam por edital*. Use sempre a lista do edital escolhido como referência.",
          "Em geral: dados da instituição, responsável, documentos legais e arquivos técnicos do projeto.",
          "Arquivos muito grandes ou formatos não aceitos pelo formulário: siga a orientação do edital ou fale com a equipe (*6*).",
          `Editais: ${url("/editais")}`,
        ],
      },
      {
        key: "c",
        label: "Após o envio / status",
        lines: [
          "Após enviar, o andamento segue as regras do edital (análise, habilitação, resultado).",
          "Resultados e comunicações oficiais costumam aparecer no site (editais/transparência) ou por contato informado no processo.",
          "Não conseguimos confirmar status só por mensagem automática — para caso específico, digite *6* com o *nome do edital* e o protocolo.",
          `Transparência: ${url("/transparencia")}`,
        ],
      },
    ],
  },
  transparencia: {
    id: "transparencia",
    state: "topic_transparencia",
    intro: [
      "*Transparência*",
      "Publicamos informações para *controle social* e acompanhamento das ações do Instituto.",
      `Portal: ${url("/transparencia")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "O que encontro na transparência",
        lines: [
          "Na área de transparência você pode encontrar documentos, informações de parcerias e materiais de prestação de contas *conforme publicados*.",
          `Acessar: ${url("/transparencia")}`,
          "Digite *B* para prestação de contas, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Prestação de contas e documentos",
        lines: [
          "Documentos oficiais são publicados conforme o ciclo de cada processo/parceria.",
          "Se busca um documento específico e não localizou, digite *6* informando *qual documento* e o *período/processo*.",
          `Transparência: ${url("/transparencia")}`,
        ],
      },
      {
        key: "c",
        label: "LGPD e dados pessoais",
        lines: [
          "O tratamento de dados pessoais segue a política de privacidade / LGPD do site.",
          "Pedidos sobre seus dados ou exercício de direitos: use o canal de contato oficial ou digite *6*.",
          `Site: ${url("/")}`,
        ],
      },
    ],
  },
  eventos: {
    id: "eventos",
    state: "topic_eventos",
    intro: [
      "*Eventos*",
      "Confira a agenda pública de ações, encontros e atividades do IPECC.",
      `Agenda: ${url("/eventos")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "Ver agenda de eventos",
        lines: [
          "A listagem de eventos publicados está na página de Eventos.",
          `Abrir agenda: ${url("/eventos")}`,
          "Digite *B* para inscrição/participação, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Inscrição e participação",
        lines: [
          "Quando houver inscrição, as regras ficam na página do evento (data, local, vagas e formulário).",
          "Se o evento exigir confirmação com a equipe, digite *6* e informe o *nome do evento*.",
          `Eventos: ${url("/eventos")}`,
        ],
      },
      {
        key: "c",
        label: "Evento passado / material",
        lines: [
          "Registros e materiais de eventos anteriores podem aparecer no site ou na transparência, quando publicados.",
          "Não encontrou o que procura? Digite *6* com o nome do evento e a data aproximada.",
          `Eventos: ${url("/eventos")}`,
          `Transparência: ${url("/transparencia")}`,
        ],
      },
    ],
  },
};

export function topicStateToId(
  state: ConversationState
): Exclude<MenuOptionId, "equipe"> | null {
  switch (state) {
    case "topic_projetos":
      return "projetos";
    case "topic_editais":
      return "editais";
    case "topic_propostas":
      return "propostas";
    case "topic_transparencia":
      return "transparencia";
    case "topic_eventos":
      return "eventos";
    default:
      return null;
  }
}

export function topicSubmenuLines(script: TopicScript): string[] {
  return [
    ...script.intro,
    "",
    ...script.subs.map((s) => `${s.key.toUpperCase()} — ${s.label}`),
    "0 — Voltar ao menu principal",
    "6 — Falar com a equipe",
  ];
}

export function resolveTopicSubKey(input: string): TopicSubKey | null {
  const t = input.trim().toLowerCase();
  if (t === "a" || t === "b" || t === "c") return t;
  if (t === "1a" || t.startsWith("a ") || t.startsWith("a-") || t.startsWith("a—"))
    return "a";
  if (t === "1b" || t.startsWith("b ") || t.startsWith("b-") || t.startsWith("b—"))
    return "b";
  if (t === "1c" || t.startsWith("c ") || t.startsWith("c-") || t.startsWith("c—"))
    return "c";
  return null;
}

export function findTopicSubByLabel(
  script: TopicScript,
  input: string
): TopicSubOption | null {
  const t = input.trim().toLowerCase();
  if (!t || t.length < 4) return null;
  return (
    script.subs.find(
      (s) =>
        t.includes(s.label.toLowerCase()) ||
        s.label
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .some((w) => t.includes(w))
    ) ?? null
  );
}
