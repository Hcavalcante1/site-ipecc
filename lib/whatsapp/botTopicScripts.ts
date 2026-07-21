import type { ConversationState, MenuOptionId } from "./types";
import { getPublicSiteUrl } from "@/lib/seo";

function siteBase(): string {
  return getPublicSiteUrl();
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

/** Scripts profundos por tema — alinhados ao conteúdo público do site. */
export const TOPIC_SCRIPTS: Record<
  Exclude<MenuOptionId, "equipe">,
  TopicScript
> = {
  projetos: {
    id: "projetos",
    state: "topic_projetos",
    intro: [
      "*Projetos e programas do IPECC*",
      "Atuamos em *educação, cultura, esporte e cidadania*, com escolas, comunidades, OSCs e poder público no Estado de São Paulo.",
      "Os eixos se adaptam a cada território, com metas claras e acompanhamento público.",
      "Visão institucional de impacto: *+120* projetos · *35* municípios · *50.000+* pessoas · *300+* parceiros.",
      `Portfólio completo: ${url("/projetos")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "Programas e eixos",
        lines: [
          "Principais programas publicados no site:",
          `• *Valer Mais* — valorização da educação pública, aprendizado e permanência escolar. ${url("/projetos/valer-mais")}`,
          `• *Oficinas de Educação Cidadã* — cidadania, sustentabilidade e participação social. ${url("/projetos/oficinas-educacao-cidada")}`,
          `• *Cultura e Inclusão Social* — circuitos culturais e acesso à cultura em periferias. ${url("/projetos/cultura-inclusao-social")}`,
          `• *Parcerias Institucionais* — cooperação com poder público, escolas e OSCs. ${url("/projetos/parcerias-institucionais")}`,
          "Eixos recorrentes: *educação, cultura, esporte e gestão*.",
          `Ver todos: ${url("/projetos")}`,
          "Digite *B* ou *C* para continuar, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Como acompanhar um projeto",
        lines: [
          "No site você encontra a listagem e, quando publicados, a página de detalhe de cada projeto (objetivos, público e parceiros).",
          "Resultados e números de impacto também aparecem na vitrine institucional e na área de projetos.",
          "Para *prestação de contas*, convênios e documentos oficiais, use a *Transparência* (opção *4* no menu).",
          `Projetos: ${url("/projetos")}`,
          `Transparência: ${url("/transparencia")}`,
          `Notícias e destaques: ${url("/inicio")}`,
          "Digite *0* para o menu ou *6* para falar com a equipe sobre um projeto específico.",
        ],
      },
      {
        key: "c",
        label: "Parcerias e escolas",
        lines: [
          "Parcerias com escolas, poder público e instituições seguem fluxo formal do IPECC (editais, convênios ou contato institucional).",
          "Públicos típicos do portal: *poder público*, *OSCs e fornecedores*, *comunidade* e *equipe/gestores*.",
          "Jornada sugerida: 1) conhecer a atuação → 2) participar de um edital → 3) enviar proposta e acompanhar.",
          "Se busca *chamada pública*: use *Editais* (opção *2*) e *Enviar proposta* (opção *3*).",
          `Editais: ${url("/editais")} · Propostas: ${url("/propostas")} · Quem somos: ${url("/quem-somos")}`,
          "Para conversar com a equipe sobre parceria: digite *6*.",
        ],
      },
    ],
  },
  editais: {
    id: "editais",
    state: "topic_editais",
    intro: [
      "*Editais e chamadas públicas*",
      "Aqui ficam as *oportunidades oficiais* do Instituto para participação de instituições, OSCs, fornecedores e parceiros.",
      "No site você consulta modalidade, período, *status*, PDF do edital e, quando houver, o link para enviar proposta.",
      `Lista oficial: ${url("/editais")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "Ver editais publicados",
        lines: [
          "Abra a página de editais e confira os itens publicados. Cada card traz objeto, prazos, status e documentos.",
          "Atenção: *leia o edital completo* (regulamento e anexos) antes de preparar a proposta.",
          "A documentação exigida costuma variar conforme o tipo de participante (*PJ*, *OSC* ou *PF*) e o edital escolhido.",
          `Abrir editais: ${url("/editais")}`,
          "Digite *B* para o passo a passo de participação, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Como participar",
        lines: [
          "1) Abra o edital de interesse e leia o *regulamento* e os *anexos*.",
          "2) Separe a documentação exigida (habilitação jurídica, regularidade fiscal/trabalhista e qualificação técnica — conforme o edital e o tipo PJ/OSC/PF).",
          "3) Envie a proposta pelo *formulário oficial* do site (opção *3* — Enviar proposta). Este chat *não* substitui o envio formal.",
          "4) Guarde comprovante/protocolo, quando gerado.",
          `Editais: ${url("/editais")}`,
          `Propostas: ${url("/propostas")}`,
          "Dúvida específica de um edital: digite *6* e informe o *nome do edital*.",
        ],
      },
      {
        key: "c",
        label: "Prazos e documentos",
        lines: [
          "Prazos, checklist e modelos de documentos estão *dentro de cada edital* — não há um prazo único para todos.",
          "Sempre confira a publicação do edital escolhido (data de abertura, encerramento e eventuais retificações).",
          "Se o prazo for *hoje* ou houver risco de perda de prazo, digite *6* e mencione o edital com urgência.",
          "Para orientação geral sobre documentação, o site também organiza exigências por tipo de pessoa (PJ / OSC / PF).",
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
      "O *canal oficial* de envio é o formulário do site, em etapas, com anexos — não substituímos esse fluxo por mensagem neste assistente.",
      "O formulário costuma seguir: dados → habilitação jurídica → regularidade fiscal → qualificação técnica → resumo e envio.",
      `Formulário: ${url("/propostas")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "Passo a passo do envio",
        lines: [
          "1) Identifique o *edital* correspondente em Editais.",
          "2) Reúna anexos e dados pedidos no edital (eles variam por chamada).",
          "3) Preencha o formulário em *Propostas* pelas etapas (dados, habilitação, fiscal, qualificação).",
          "4) Revise o resumo e envie.",
          "5) Guarde o comprovante/protocolo gerado (quando houver).",
          "Em alguns casos existe fluxo especial de *cotação prévia de preços* — siga a orientação do edital.",
          `Abrir formulário: ${url("/propostas")} · Editais: ${url("/editais")}`,
          "Digite *B* para documentos, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Documentos e anexos",
        lines: [
          "Os anexos *variam por edital*. Use sempre a lista do edital escolhido como referência oficial.",
          "Em geral: dados da instituição/responsável, documentos de *habilitação jurídica*, *regularidade fiscal/trabalhista* e *qualificação técnica*.",
          "O portal trata tipologias *PJ*, *OSC* e *PF* — o checklist muda conforme o tipo.",
          "Arquivos muito grandes ou formatos não aceitos: siga a orientação do edital ou fale com a equipe (*6*).",
          `Editais: ${url("/editais")} · Propostas: ${url("/propostas")}`,
        ],
      },
      {
        key: "c",
        label: "Após o envio / status",
        lines: [
          "Após enviar, o andamento segue as regras do edital (análise, habilitação, resultado).",
          "Resultados e comunicações oficiais costumam aparecer no site (editais/transparência) ou pelo contato informado no processo.",
          "Este assistente *não confirma status* de proposta individual automaticamente.",
          "Para caso específico, digite *6* com o *nome do edital* e o *protocolo* (se tiver).",
          `Transparência: ${url("/transparencia")} · Contato: ${url("/contato")}`,
        ],
      },
    ],
  },
  transparencia: {
    id: "transparencia",
    state: "topic_transparencia",
    intro: [
      "*Transparência*",
      "A transparência é *compromisso permanente* do IPECC: ética, publicidade, governança e controle social.",
      "No portal publicamos informações para acompanhamento das ações, parcerias e prestação de contas — conforme disponibilizadas.",
      `Portal de transparência: ${url("/transparencia")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "O que encontro na transparência",
        lines: [
          "Na área de transparência você pode encontrar, quando publicados:",
          "• documentos institucionais (ex.: estatuto, atas, CNPJ, regimento, código de conduta, política de privacidade/LGPD, CNDs);",
          "• informações de parcerias e editais de parceria;",
          "• materiais de prestação de contas por convênio/fase.",
          `Acessar: ${url("/transparencia")}`,
          "Digite *B* para prestação de contas, *C* para LGPD/integridade, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Prestação de contas e documentos",
        lines: [
          "Documentos oficiais são publicados conforme o ciclo de cada processo/parceria.",
          "Use o portal para localizar prestação de contas e materiais de acompanhamento.",
          "Se busca um documento específico e não localizou, digite *6* informando *qual documento*, o *período* e o *processo/convênio* (se souber).",
          `Transparência: ${url("/transparencia")}`,
          `Editais: ${url("/editais")}`,
        ],
      },
      {
        key: "c",
        label: "LGPD e dados pessoais",
        lines: [
          "O tratamento de dados pessoais segue a política de privacidade / LGPD do Instituto.",
          "Canal LGPD: *lgpd@ipecc.org.br*",
          "Canal de integridade: *integridade@ipecc.org.br*",
          "Dados institucionais: *CNPJ 05.965.225/0001-04*.",
          "Pedidos sobre seus dados ou exercício de direitos: use esses canais, a página de contato ou digite *6*.",
          `Transparência: ${url("/transparencia")} · Contato: ${url("/contato")}`,
        ],
      },
    ],
  },
  eventos: {
    id: "eventos",
    state: "topic_eventos",
    intro: [
      "*Eventos*",
      "Confira a *agenda pública* de ações, encontros, oficinas e atividades do IPECC.",
      "Cada evento publicado traz data, horário, local e, quando houver, canal de contato.",
      `Agenda: ${url("/eventos")}`,
      "Escolha o que deseja saber:",
    ],
    subs: [
      {
        key: "a",
        label: "Ver agenda de eventos",
        lines: [
          "A listagem de eventos publicados está na página de Eventos do site.",
          "Ali você confere o que está previsto e os detalhes de cada ação.",
          `Abrir agenda: ${url("/eventos")}`,
          `Destaques e notícias também aparecem em: ${url("/inicio")}`,
          "Digite *B* para inscrição/participação, *0* para o menu ou *6* para a equipe.",
        ],
      },
      {
        key: "b",
        label: "Inscrição e participação",
        lines: [
          "Quando houver inscrição, as regras ficam na página do evento (data, local, vagas e formulário, se houver).",
          "Alguns eventos usam WhatsApp ou confirmação com a equipe — siga a orientação publicada no card do evento.",
          "Se o evento exigir confirmação humana, digite *6* e informe o *nome do evento* e a *data*.",
          `Eventos: ${url("/eventos")}`,
        ],
      },
      {
        key: "c",
        label: "Evento passado / material",
        lines: [
          "Registros e materiais de eventos anteriores podem aparecer no site, na vitrine de notícias ou na transparência, quando publicados.",
          "Não encontrou o que procura? Digite *6* com o nome do evento e a data aproximada.",
          `Eventos: ${url("/eventos")}`,
          `Notícias / início: ${url("/inicio")}`,
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
