// app/transparencia/page.tsx

import { getDownloadUrl, isValidFileUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabaseServer";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";
import { PublicHeroRolling } from "@/components/public";
import PublicWhatsAppHelpLine from "@/components/public/PublicWhatsAppHelpLine";
function fileUrl(url?: string | null) {
  if (!url) return "";

  const clean = url.trim();

  if (clean.includes("/storage/v1/object/")) {
    const partes = clean.split("/storage/v1/object/");
    return `/api/download/${partes[1]}`; // 🔥 CORREÇÃO
  }

  if (clean.startsWith("transparencia/")) {
    return `/api/download/public/docs/${clean}`;
  }

  return clean;
}



export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";



type LinkItem = { label: string; url: string };
type CardGrupo = { titulo: string; links: LinkItem[] };

type BlocoConteudo = {
  bloco: string;
  titulo?: string | null;
  texto?: string | null;
  updated_at?: string | null;
  extra?: {
    grupos?: CardGrupo[];
    links?: LinkItem[];
    botaoLabel?: string;
    botaoUrl?: string;
    [key: string]: any;
  } | null;
};

type TransparenciaConvenio = {
  id: string;
  edital_id?: string | null;
  titulo?: string | null;
  numero_instrumento?: string | null;
  tipo_instrumento?: string | null;
  categoria?: string | null;
  objeto?: string | null;
  contratado?: string | null;
  cnpj?: string | null;
  data_assinatura?: string | null;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  status?: string | null;
  plano_trabalho_url?: string | null;
  documento_principal_url?: string | null;
  relatorio_parcial_url?: string | null;
  relatorio_final_url?: string | null;
  aditivos?: any;
  documentos_extras?: any;
  observacoes?: string | null;
  ordem?: number | null;
  publicado?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TransparenciaEdital = {
  id: string;
  edital_id?: string | null;
  status_fase?: string | null;
  resultado_preliminar_titulo?: string | null;
  resultado_preliminar_url?: string | null;
  prazo_recurso_inicio?: string | null;
  prazo_recurso_fim?: string | null;
  resultado_final_titulo?: string | null;
  resultado_final_url?: string | null;
  homologacao_titulo?: string | null;
  homologacao_url?: string | null;
  contrato_titulo?: string | null;
  contrato_url?: string | null;
  observacoes?: string | null;
  publicado?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DocumentoGovernancaEdital = {
  id: string;
  edital_id?: string | null;
  tipo?: string | null;
  fase?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  arquivo_url?: string | null;
  publicado?: boolean | null;
  publicado_em?: string | null;
  created_at?: string | null;
};

type EditalGovernanca = {
  id: string;
  titulo?: string | null;
  tipo?: string | null;
  status?: string | null;
  fase_atual?: string | null;
  periodo?: string | null;
  periodo_envio?: string | null;
};

const FASE_GOVERNANCA_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  recebimento_propostas: "Recebimento de propostas",
  analise: "Analise tecnica",
  resultado_preliminar: "Resultado preliminar",
  recurso: "Recursos",
  julgamento_recurso: "Julgamento dos recursos",
  resultado_final: "Resultado final",
  homologado: "Homologacao",
  adjudicado: "Adjudicacao",
  contratado: "Contrato / termo",
  execucao: "Execucao",
  prestacao_contas: "Prestacao de contas",
  encerrado: "Encerramento",
};

const FASE_GOVERNANCA_ORDEM = Object.keys(FASE_GOVERNANCA_LABELS);
const FASES_PUBLICAS_TIMELINE = [
  "publicado",
  "resultado_preliminar",
  "recurso",
  "resultado_final",
  "homologado",
  "contratado",
  "execucao",
  "prestacao_contas",
  "encerrado",
];

const TIPO_DOCUMENTO_GOVERNANCA_LABELS: Record<string, string> = {
  edital: "Edital",
  anexo: "Anexo",
  ata: "Ata",
  parecer: "Parecer",
  recurso: "Recurso",
  julgamento: "Julgamento",
  resultado_preliminar: "Resultado preliminar",
  resultado_final: "Resultado final",
  homologacao: "Homologacao",
  adjudicacao: "Adjudicacao",
  contrato: "Contrato",
  termo_parceria: "Termo de parceria",
  prestacao_de_contas: "Prestacao de contas",
  encerramento: "Encerramento",
};

type PrestacaoConvenioRef = {
  id: string;
  titulo?: string | null;
  numero_instrumento?: string | null;
  tipo_instrumento?: string | null;
  contratado?: string | null;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  status?: string | null;
};

type TransparenciaPrestacaoConta = {
  id: string;
  convenio_id?: string | null;
  fase_prestacao?: string | null;
  status_prestacao?: string | null;
  tipo_documento?: string | null;
  documento_titulo?: string | null;
  documento_url?: string | null;
  referencia_inicio?: string | null;
  referencia_fim?: string | null;
  observacoes?: string | null;
  ordem?: number | null;
  publicado?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  transparencia_convenios?: PrestacaoConvenioRef | null;
};

type PrestacaoAgrupada = {
  convenio: PrestacaoConvenioRef;
  itens: TransparenciaPrestacaoConta[];
  fases: Record<string, TransparenciaPrestacaoConta[]>;
};

const FALLBACK_HERO = {
  titulo: "Transparência",
  texto:
    "Transparência é um compromisso permanente do IPECC. Publicamos informações institucionais, documentos, relatórios e prestações de contas para garantir o controle social e o acesso público aos resultados.",
};

const FALLBACK_COMPROMISSOS = {
  titulo: "Compromissos e princípios",
  texto:
    "Atuamos com ética, publicidade dos atos e responsabilidade no uso de recursos. Nossos processos observam a legislação vigente, boas práticas de governança e a participação social. Este espaço reúne os principais documentos exigidos por órgãos de controle e pelos instrumentos de parceria com o poder público.",
};

const FALLBACK_DOCS_INSTITUCIONAIS: CardGrupo[] = [
  {
    titulo: "Atos constitutivos",
    links: [
      { label: "Estatuto Social (atualizado)", url: "/docs/estatuto-social.pdf" },
      {
        label: "Ata de Eleição e Posse da Diretoria",
        url: "/docs/ata-eleicao-diretoria.pdf",
      },
      { label: "Cartão CNPJ", url: "/docs/cnpj-cartao.pdf" },
    ],
  },
  {
    titulo: "Governança e conformidade",
    links: [
      {
        label: "Regimento Interno / Políticas",
        url: "/docs/regimento-interno.pdf",
      },
      {
        label: "Código de Conduta e Integridade",
        url: "/docs/codigo-conduta.pdf",
      },
      {
        label: "Política de Privacidade e LGPD",
        url: "/docs/politica-lgpd.pdf",
      },
    ],
  },
  {
    titulo: "Habilitações e certidões",
    links: [
      { label: "CND Federal (RFB / PGFN)", url: "/docs/cnd-federal.pdf" },
      { label: "CND Estadual", url: "/docs/cnd-estadual.pdf" },
      { label: "CND Municipal", url: "/docs/cnd-municipal.pdf" },
    ],
  },
];

const FALLBACK_PRESTACAO = {
  titulo: "Prestação de contas",
  texto:
    "Divulgamos a execução dos convênios firmados com hierarquia por instrumento, fase da prestação e documentos vinculados, incluindo relatórios, pareceres, termos de aprovação e peças de encerramento quando aplicável.",
};

const FALLBACK_LGPD = {
  titulo: "LGPD e integridade",
  texto:
    "O IPECC está comprometido com a proteção de dados pessoais e com a integridade institucional. Para solicitações relacionadas à LGPD ou relatos de conduta, disponibilizamos canais específicos de atendimento com registro e retorno.",
  links: [
    {
      label: "Política de Privacidade e Proteção de Dados",
      url: "/docs/politica-lgpd.pdf",
    },
    { label: "Canal LGPD — lgpd@ipecc.org.br", url: "mailto:lgpd@ipecc.org.br" },
    {
      label: "Canal de Integridade — integridade@ipecc.org.br",
      url: "mailto:integridade@ipecc.org.br",
    },
  ] as LinkItem[],
};

const FALLBACK_CTA = {
  titulo: "Acesso rápido a documentos",
  texto: "Baixe diretamente os principais arquivos publicados pelo IPECC.",
  botaoLabel: "Baixar Relatório de Atividades",
  botaoUrl: "/docs/transparencia/prestacao/relatorio-atividades.pdf",
};

const FASE_PRESTACAO_ORDEM = [
  "Execução",
  "Monitoramento",
  "Prestação parcial",
  "Prestação final",
  "Análise",
  "Encerramento",
];

function getBlock(data: BlocoConteudo[] | null | undefined, bloco: string): BlocoConteudo | null {
  if (!data?.length) return null;
  const matches = data.filter((item) => item.bloco === bloco);
  if (!matches.length) return null;
  return matches.sort(
    (a, b) =>
      new Date(b.updated_at || 0).getTime() -
      new Date(a.updated_at || 0).getTime()
  )[0];
}

function getGrupoExtra(block?: BlocoConteudo | null, key = "grupos"): CardGrupo[] {
  const arr = block?.extra?.[key];
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (item): item is CardGrupo =>
      !!item &&
      typeof item === "object" &&
      typeof item.titulo === "string" &&
      Array.isArray(item.links)
  );
}

function getLinksExtra(block?: BlocoConteudo | null, key = "links"): LinkItem[] {
  const arr = block?.extra?.[key];
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (item): item is LinkItem =>
      !!item &&
      typeof item === "object" &&
      typeof item.label === "string" &&
      typeof item.url === "string"
  );
}

function flattenGrupoLinks(grupos: CardGrupo[]): LinkItem[] {
  return grupos.flatMap((grupo) => (Array.isArray(grupo.links) ? grupo.links : []));
}


function getFirstRealFileLink(...collections: LinkItem[][]): LinkItem | null {
  for (const collection of collections) {
    for (const item of collection) {
      if (isValidFileUrl(item?.url)) return item;
    }
  }
  return null;
}

function formatMesAno(dateString?: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDataCompleta(dateString?: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function capitalizeFirst(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function safeText(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function labelFase(value?: string | null): string {
  const clean = safeText(value);
  if (!clean) return "";
  return FASE_GOVERNANCA_LABELS[clean] || clean.replace(/_/g, " ");
}

function labelTipoDocumentoGovernanca(value?: string | null): string {
  const clean = safeText(value);
  if (!clean) return "";
  return TIPO_DOCUMENTO_GOVERNANCA_LABELS[clean] || clean.replace(/_/g, " ");
}

function getGovernancaDownloadUrl(url?: string | null): string {
  const clean = safeText(url);
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return getDownloadUrl(clean);
  if (clean.startsWith("/api/download/")) return clean;
  return `/api/download/docs/${clean}`;
}

function parseLinkArray(input: any): LinkItem[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (item): item is LinkItem =>
      !!item &&
      typeof item === "object" &&
      typeof item.label === "string" &&
      typeof item.url === "string" &&
      item.label.trim() !== "" &&
      item.url.trim() !== ""
  );
}

function getPrestacaoPeriodo(item: TransparenciaPrestacaoConta): string {
  const inicio = formatDate(item.referencia_inicio);
  const fim = formatDate(item.referencia_fim);

  if (inicio && fim) return `${inicio} até ${fim}`;
  if (inicio) return `Desde ${inicio}`;
  if (fim) return `Até ${fim}`;
  return "";
}

function ordenarFases(fases: string[]): string[] {
  return [...fases].sort((a, b) => {
    const indexA = FASE_PRESTACAO_ORDEM.indexOf(a);
    const indexB = FASE_PRESTACAO_ORDEM.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b, "pt-BR");
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

function agruparPrestacoes(
  prestacoes: TransparenciaPrestacaoConta[]
): PrestacaoAgrupada[] {
  const mapa = prestacoes.reduce<Record<string, PrestacaoAgrupada>>((acc, item) => {
    const convenio = item.transparencia_convenios;

    if (!convenio?.id) return acc;

    if (!acc[convenio.id]) {
      acc[convenio.id] = {
        convenio,
        itens: [],
        fases: {},
      };
    }

    acc[convenio.id].itens.push(item);

    const fase = safeText(item.fase_prestacao) || "Outros";
    if (!acc[convenio.id].fases[fase]) {
      acc[convenio.id].fases[fase] = [];
    }

    acc[convenio.id].fases[fase].push(item);

    return acc;
  }, {});

  return Object.values(mapa).sort((a, b) => {
    const ordemA = Math.min(...a.itens.map((item) => item.ordem ?? 999999));
    const ordemB = Math.min(...b.itens.map((item) => item.ordem ?? 999999));

    if (ordemA !== ordemB) return ordemA - ordemB;

    return (a.convenio.titulo || "").localeCompare(b.convenio.titulo || "", "pt-BR");
  });
}


function getStatusBadgeStyle(status?: string | null): React.CSSProperties {
  const normalized = safeText(status).toLowerCase();

  if (
    normalized.includes("encerrad") ||
    normalized.includes("finalizad") ||
    normalized.includes("aprovada")
  ) {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 12px",
      borderRadius: 999,
      background: "rgba(34,197,94,0.12)",
      color: "#166534",
      border: "1px solid rgba(34,197,94,0.22)",
      fontSize: "0.82rem",
      fontWeight: 700,
    };
  }

  if (
    normalized.includes("análise") ||
    normalized.includes("analise") ||
    normalized.includes("parcial")
  ) {
    return {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 12px",
      borderRadius: 999,
      background: "rgba(245,158,11,0.12)",
      color: "#92400e",
      border: "1px solid rgba(245,158,11,0.22)",
      fontSize: "0.82rem",
      fontWeight: 700,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(59,130,246,0.10)",
    color: "#1d4ed8",
    border: "1px solid rgba(59,130,246,0.18)",
    fontSize: "0.82rem",
    fontWeight: 700,
  };
}

function ListaLinks({ links }: { links: LinkItem[] }) {
  return (
    <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
      {links.map((l, i) => {
        const isMail = l.url.startsWith("mailto:");
        return (
          <li key={`${l.url}-${i}`}>
            <a
              className="card__link"
             href={getDownloadUrl(l.url)}
              target={isMail ? undefined : "_blank"}
              rel={isMail ? undefined : "noreferrer"}
            >
              {l.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export default async function TransparenciaPage() {
  const supabase = createClient(); // 👈 ADICIONE ISSO

  const [
    { data, error },
    { data: conveniosData, error: conveniosError },
    { data: contratacoesData, error: contratacoesError },
    { data: prestacoesData, error: prestacoesError },
    { data: documentosGovernancaData, error: documentosGovernancaError },
  ] = await Promise.all([
    supabase
      .from("paginas_conteudo")
      .select("bloco,titulo,texto,extra,updated_at,created_at")
      .eq("pagina_slug", "transparencia")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),

    supabase
      .from("transparencia_convenios")
      .select("*")
      .eq("publicado", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false }),

    supabase
      .from("transparencia_editais")
      .select("*")
      .eq("publicado", true)
      .order("created_at", { ascending: false }),

    supabase
      .from("transparencia_prestacao_contas")
      .select(
        `
          *,
          transparencia_convenios (
            id,
            titulo,
            numero_instrumento,
            tipo_instrumento,
            contratado,
            vigencia_inicio,
            vigencia_fim,
            status
          )
        `
      )
      .eq("publicado", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true }),

    supabase
      .from("documentos_publicos")
      .select("id,edital_id,tipo,fase,titulo,descricao,arquivo_url,publicado,publicado_em,created_at")
      .eq("publicado", true)
      .order("publicado_em", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  const documentosGovernanca = documentosGovernancaError
    ? []
    : ((documentosGovernancaData ?? []) as DocumentoGovernancaEdital[]);

  const editalIdsGovernanca = Array.from(
    new Set(
      documentosGovernanca
        .map((item) => safeText(item.edital_id))
        .filter((id) => id.length > 0)
    )
  );

  const { data: editaisGovernancaData, error: editaisGovernancaError } =
    editalIdsGovernanca.length > 0
      ? await supabase
          .from("editais")
          .select("id,titulo,tipo,status,fase_atual,periodo,periodo_envio")
          .in("id", editalIdsGovernanca)
      : { data: [], error: null };

  logPublicFetch({
    page: "/transparencia",
    table: "paginas_conteudo+transparencia_*+documentos_publicos",
    count:
      (data?.length ?? 0) +
      (conveniosData?.length ?? 0) +
      (contratacoesData?.length ?? 0) +
      (prestacoesData?.length ?? 0) +
      (documentosGovernancaData?.length ?? 0),
    error:
      error?.message ||
      conveniosError?.message ||
      contratacoesError?.message ||
      prestacoesError?.message ||
      documentosGovernancaError?.message ||
      editaisGovernancaError?.message,
  });

  const blocos = error ? [] : (data ?? []);
  const convenios = conveniosError ? [] : ((conveniosData ?? []) as TransparenciaConvenio[]);
  const contratacoes = contratacoesError ? [] : ((contratacoesData ?? []) as TransparenciaEdital[]);
  const prestacoes = prestacoesError
    ? []
    : ((prestacoesData ?? []) as TransparenciaPrestacaoConta[]);
  const editaisGovernanca = editaisGovernancaError
    ? []
    : ((editaisGovernancaData ?? []) as EditalGovernanca[]);
  const editaisGovernancaPorId = new Map(
    editaisGovernanca.map((item) => [item.id, item])
  );
  const documentosGovernancaAgrupados = editalIdsGovernanca
    .map((editalId) => ({
      editalId,
      edital: editaisGovernancaPorId.get(editalId) ?? null,
      documentos: documentosGovernanca
        .filter((doc) => doc.edital_id === editalId)
        .sort((a, b) => {
          const faseA = FASE_GOVERNANCA_ORDEM.indexOf(safeText(a.fase));
          const faseB = FASE_GOVERNANCA_ORDEM.indexOf(safeText(b.fase));
          const ordemFaseA = faseA === -1 ? 999 : faseA;
          const ordemFaseB = faseB === -1 ? 999 : faseB;

          if (ordemFaseA !== ordemFaseB) return ordemFaseA - ordemFaseB;

          const dataA = new Date(a.publicado_em || a.created_at || 0).getTime();
          const dataB = new Date(b.publicado_em || b.created_at || 0).getTime();
          return dataB - dataA;
        }),
    }))
    .filter((grupo) => grupo.documentos.length > 0)
    .sort((a, b) =>
      (a.edital?.titulo || a.editalId).localeCompare(
        b.edital?.titulo || b.editalId,
        "pt-BR"
      )
    );

  const heroBlock = getBlock(blocos, "hero");
  const compromissosBlock = getBlock(blocos, "compromissos");
  const docsBlock = getBlock(blocos, "docs_institucionais");
  const prestacaoBlock = getBlock(blocos, "prestacao_contas");
  const lgpdBlock = getBlock(blocos, "lgpd_integridade");
  const ctaBlock = getBlock(blocos, "cta_docs");

  const hero = {
    titulo: heroBlock?.titulo || FALLBACK_HERO.titulo,
    texto: heroBlock?.texto || FALLBACK_HERO.texto,
  };

  const compromissos = {
    titulo: compromissosBlock?.titulo || FALLBACK_COMPROMISSOS.titulo,
    texto: compromissosBlock?.texto || FALLBACK_COMPROMISSOS.texto,
  };

  const docsInstitucionais: CardGrupo[] = (() => {
    const grupos = getGrupoExtra(docsBlock, "grupos");
    return grupos.length > 0 ? grupos : FALLBACK_DOCS_INSTITUCIONAIS;
  })();

  const prestacao = {
    titulo: prestacaoBlock?.titulo || FALLBACK_PRESTACAO.titulo,
    texto: prestacaoBlock?.texto || FALLBACK_PRESTACAO.texto,
  };

  const lgpd = {
    titulo: lgpdBlock?.titulo || FALLBACK_LGPD.titulo,
    texto: lgpdBlock?.texto || FALLBACK_LGPD.texto,
    links: (() => {
      const links = getLinksExtra(lgpdBlock, "links");
      return links.length > 0 ? links : FALLBACK_LGPD.links;
    })(),
  };

  const docsLinks = flattenGrupoLinks(docsInstitucionais);

  const convenioLinks = convenios.flatMap((item) => {
    const extras = parseLinkArray(item.documentos_extras);
    const links: LinkItem[] = [];

    if (isValidFileUrl(item.documento_principal_url)) {
      links.push({
        label: `Documento principal — ${item.titulo || "instrumento"}`,
        url: item.documento_principal_url as string,
      });
    }

    if (isValidFileUrl(item.plano_trabalho_url)) {
      links.push({
        label: `Plano de trabalho — ${item.titulo || "instrumento"}`,
        url: item.plano_trabalho_url as string,
      });
    }

    if (isValidFileUrl(item.relatorio_parcial_url)) {
      links.push({
        label: `Relatório parcial — ${item.titulo || "instrumento"}`,
        url: item.relatorio_parcial_url as string,
      });
    }

    if (isValidFileUrl(item.relatorio_final_url)) {
      links.push({
        label: `Relatório final — ${item.titulo || "instrumento"}`,
        url: item.relatorio_final_url as string,
      });
    }

    return [...links, ...extras];
  });

  const contratacaoLinks = contratacoes.flatMap((item) => {
    const links: LinkItem[] = [];

    if (isValidFileUrl(item.resultado_preliminar_url)) {
      links.push({
        label: item.resultado_preliminar_titulo || "Resultado preliminar",
        url: item.resultado_preliminar_url as string,
      });
    }

    if (isValidFileUrl(item.resultado_final_url)) {
      links.push({
        label: item.resultado_final_titulo || "Resultado final",
        url: item.resultado_final_url as string,
      });
    }

    if (isValidFileUrl(item.homologacao_url)) {
      links.push({
        label: item.homologacao_titulo || "Homologação",
        url: item.homologacao_url as string,
      });
    }

    if (isValidFileUrl(item.contrato_url)) {
      links.push({
        label: item.contrato_titulo || "Contrato",
        url: item.contrato_url as string,
      });
    }

    return links;
  });

  const prestacaoDocumentLinks = prestacoes.flatMap((item) => {
    if (!isValidFileUrl(item.documento_url)) return [];

    const convenioTitulo = safeText(item.transparencia_convenios?.titulo) || "convênio";
    const tipoDocumento = safeText(item.tipo_documento) || "Documento";
    const documentoTitulo = safeText(item.documento_titulo);

    return [
      {
        label: documentoTitulo
          ? `${tipoDocumento} — ${documentoTitulo} — ${convenioTitulo}`
          : `${tipoDocumento} — ${convenioTitulo}`,
        url: item.documento_url as string,
      },
    ];
  });

  const fallbackRealLink =
    getFirstRealFileLink(
      prestacaoDocumentLinks,
      docsLinks,
      convenioLinks,
      contratacaoLinks,
      lgpd.links
    ) || {
      label: FALLBACK_CTA.botaoLabel,
      url: FALLBACK_CTA.botaoUrl,
    };

  const ctaBotaoUrl =
    (isValidFileUrl(ctaBlock?.extra?.botaoUrl) ? ctaBlock?.extra?.botaoUrl : null) ||
    fallbackRealLink.url;

  const mesAnoCta = capitalizeFirst(formatMesAno(ctaBlock?.updated_at));
  const dataAtualizacaoCta = formatDataCompleta(ctaBlock?.updated_at);

  const cta = {
    titulo: ctaBlock?.titulo || FALLBACK_CTA.titulo,
    texto: ctaBlock?.texto || FALLBACK_CTA.texto,
    botaoLabel: mesAnoCta ? `Baixar Relatório — ${mesAnoCta}` : FALLBACK_CTA.botaoLabel,
    botaoUrl: ctaBotaoUrl,
    ultimaAtualizacao: dataAtualizacaoCta,
  };

  const prestacoesAgrupadas = agruparPrestacoes(prestacoes);

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/transparencia/hero.webp"
        title={hero.titulo}
        text={hero.texto}
        ariaLabel="Transparência IPECC"
      />

      <PublicWhatsAppHelpLine
        assunto="transparencia"
        intro="Dúvidas sobre transparência ou documentos?"
        linkLabel="Fale conosco no WhatsApp"
      />

      <section className="sobre" aria-labelledby="compromissos">
        <div className="container">
          <h2 id="compromissos">{compromissos.titulo}</h2>
          <p>{compromissos.texto}</p>
        </div>
      </section>

      <section className="sobre" aria-labelledby="docs-institucionais">
        <div className="container">
          <h2 id="docs-institucionais">Documentos institucionais</h2>
          <div className="cards__grid" style={{ marginTop: 16 }}>
            {docsInstitucionais.map((grupo, idx) => (
              <article className="card" key={`${grupo.titulo}-${idx}`}>
                <div className="card__body">
                  <h3 className="card__title">{grupo.titulo}</h3>
                  <ListaLinks links={grupo.links} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sobre" aria-labelledby="instrumentos-e-contratacao">
        <div className="container">
          <h2 id="instrumentos-e-contratacao">Parcerias, instrumentos e execução</h2>

          <div
            className="cards__grid"
            style={{
              marginTop: 20,
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
              gap: 24,
              alignItems: "start",
            }}
          >
            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Termos de convênio e execução</h3>

                {convenios.length === 0 ? (
                  <p>Nenhum instrumento publicado no momento.</p>
                ) : (
                  <div style={{ display: "grid", gap: 20 }}>
                    {convenios.map((item) => {
                      const aditivos = parseLinkArray(item.aditivos);
                      const extras = parseLinkArray(item.documentos_extras);

                      return (
                        <div
                          key={item.id}
                          style={{
                            paddingBottom: 16,
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <h4 style={{ marginBottom: 10 }}>{item.titulo}</h4>

                          {safeText(item.numero_instrumento) && (
                            <p>
                              <strong>Número do instrumento:</strong> {item.numero_instrumento}
                            </p>
                          )}

                          {safeText(item.tipo_instrumento) && (
                            <p>
                              <strong>Tipo:</strong> {item.tipo_instrumento}
                            </p>
                          )}

                          {safeText(item.categoria) && (
                            <p>
                              <strong>Categoria:</strong> {item.categoria}
                            </p>
                          )}

                          {safeText(item.status) && (
                            <p>
                              <strong>Status:</strong> {item.status}
                            </p>
                          )}

                          {safeText(item.contratado) && (
                            <p>
                              <strong>Contratado:</strong> {item.contratado}
                            </p>
                          )}

                          {safeText(item.cnpj) && (
                            <p>
                              <strong>CNPJ:</strong> {item.cnpj}
                            </p>
                          )}

                          {safeText(item.objeto) && (
                            <p>
                              <strong>Objeto:</strong> {item.objeto}
                            </p>
                          )}

                          {item.data_assinatura && (
                            <p>
                              <strong>Data da assinatura:</strong> {formatDate(item.data_assinatura)}
                            </p>
                          )}

                          {(item.vigencia_inicio || item.vigencia_fim) && (
                            <p>
                              <strong>Vigência:</strong>{" "}
                              {item.vigencia_inicio ? formatDate(item.vigencia_inicio) : "—"} até{" "}
                              {item.vigencia_fim ? formatDate(item.vigencia_fim) : "—"}
                            </p>
                          )}

                          {isValidFileUrl(item.documento_principal_url) && (
                            <p>
                              <a
                                href={getDownloadUrl(item.documento_principal_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="card__link"
                              >
                                Documento principal
                              </a>
                            </p>
                          )}

                          {isValidFileUrl(item.plano_trabalho_url) && (
                            <p>
                              <a
                                href={getDownloadUrl(item.plano_trabalho_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="card__link"
                              >
                                Plano de trabalho
                              </a>
                            </p>
                          )}

                          {isValidFileUrl(item.relatorio_parcial_url) && (
                            <p>
                              <a
                                href={getDownloadUrl(item.relatorio_parcial_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="card__link"
                              >
                                Relatório parcial
                              </a>
                            </p>
                          )}

                          {isValidFileUrl(item.relatorio_final_url) && (
                            <p>
                              <a
                                href={getDownloadUrl(item.relatorio_final_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="card__link"
                              >
                                Relatório final
                              </a>
                            </p>
                          )}

                          {aditivos.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <strong>Aditivos:</strong>
                              <ListaLinks links={aditivos} />
                            </div>
                          )}

                          {extras.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <strong>Documentos complementares:</strong>
                              <ListaLinks links={extras} />
                            </div>
                          )}

                          {safeText(item.observacoes) && (
                            <p style={{ marginTop: 10 }}>
                              <strong>Observações:</strong> {item.observacoes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Editais e Chamamentos</h3>

                {documentosGovernancaAgrupados.length > 0 && (
                  <div style={{ display: "grid", gap: 20, marginBottom: 24 }}>
                    {documentosGovernancaAgrupados.map((grupo) => (
                      <div
                        key={grupo.editalId}
                        style={{
                          padding: "18px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <h4
                          style={{
                            marginBottom: 12,
                            fontSize: "1.05rem",
                            fontWeight: 700,
                          }}
                        >
                          {grupo.edital?.titulo || "Edital / Chamamento"}
                        </h4>

                        {safeText(grupo.edital?.fase_atual) && (
                          <p>
                            <strong>Fase atual:</strong>{" "}
                            {labelFase(grupo.edital?.fase_atual)}
                          </p>
                        )}

                        {safeText(grupo.edital?.periodo || grupo.edital?.periodo_envio) && (
                          <p>
                            <strong>Periodo:</strong>{" "}
                            {grupo.edital?.periodo || grupo.edital?.periodo_envio}
                          </p>
                        )}

                        <p>
                          <strong>Documentos institucionais publicados:</strong>{" "}
                          {grupo.documentos.length}
                        </p>

                        <div
                          aria-label="Linha do tempo do edital"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                            gap: 8,
                            marginTop: 14,
                          }}
                        >
                          {FASES_PUBLICAS_TIMELINE.map((fase) => {
                            const faseAtual = safeText(grupo.edital?.fase_atual);
                            const indiceAtual = FASE_GOVERNANCA_ORDEM.indexOf(faseAtual);
                            const indiceFase = FASE_GOVERNANCA_ORDEM.indexOf(fase);
                            const etapaAtual = faseAtual === fase;
                            const etapaConcluida =
                              indiceAtual >= 0 && indiceFase >= 0 && indiceFase < indiceAtual;
                            const temDocumento = grupo.documentos.some(
                              (doc) => safeText(doc.fase) === fase || safeText(doc.tipo) === fase
                            );

                            return (
                              <span
                                key={fase}
                                style={{
                                  borderRadius: 999,
                                  border: etapaAtual
                                    ? "1px solid rgba(34,197,94,.55)"
                                    : "1px solid rgba(148,163,184,.24)",
                                  background: etapaAtual
                                    ? "rgba(34,197,94,.14)"
                                    : etapaConcluida || temDocumento
                                    ? "rgba(14,165,233,.12)"
                                    : "rgba(15,23,42,.06)",
                                  color: etapaAtual ? "#166534" : "#0f172a",
                                  padding: "7px 10px",
                                  fontSize: ".78rem",
                                  fontWeight: 700,
                                  textAlign: "center",
                                }}
                              >
                                {labelFase(fase)}
                              </span>
                            );
                          })}
                        </div>

                        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                          {grupo.documentos.map((doc) => (
                            <div key={doc.id}>
                              <a
                                href={getGovernancaDownloadUrl(doc.arquivo_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="card__link"
                              >
                                {doc.titulo || labelFase(doc.tipo) || "Documento oficial"}
                              </a>
                              <p style={{ marginTop: 4 }}>
                                {safeText(doc.fase) && (
                                  <>
                                    <strong>Fase:</strong> {labelFase(doc.fase)}{" "}
                                  </>
                                )}
                                {safeText(doc.tipo) && (
                                  <>
                                    <strong>Tipo:</strong> {labelTipoDocumentoGovernanca(doc.tipo)}
                                  </>
                                )}
                              </p>
                              {safeText(doc.descricao) && <p>{doc.descricao}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {contratacoes.length === 0 && documentosGovernancaAgrupados.length === 0 ? (
                  <p>Nenhum processo publicado no momento.</p>
                ) : (
                  <div style={{ display: "grid", gap: 20 }}>
                    {contratacoes.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "18px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <h4
                          style={{
                            marginBottom: 12,
                            fontSize: "1.05rem",
                            fontWeight: 700,
                          }}
                        >
                          {item.edital_id || "Edital / Chamamento"}
                        </h4>

                        {safeText(item.status_fase) && (
                          <p>
                            <strong>Situação:</strong> {item.status_fase}
                          </p>
                        )}

                        {(item.prazo_recurso_inicio || item.prazo_recurso_fim) && (
                          <p>
                            <strong>Prazo de recurso:</strong>{" "}
                            {item.prazo_recurso_inicio
                              ? formatDate(item.prazo_recurso_inicio)
                              : "—"}{" "}
                            até{" "}
                            {item.prazo_recurso_fim ? formatDate(item.prazo_recurso_fim) : "—"}
                          </p>
                        )}

                        {item.resultado_preliminar_titulo && (
                          <p>
                            <strong>Resultado preliminar:</strong>{" "}
                            {isValidFileUrl(item.resultado_preliminar_url) ? (
                              <a
                                href={getDownloadUrl(item.resultado_preliminar_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="card__link"
                              >
                                {item.resultado_preliminar_titulo}
                              </a>
                            ) : (
                              item.resultado_preliminar_titulo
                            )}
                          </p>
                        )}

                        {item.resultado_final_titulo && (
                          <p>
                            <strong>Resultado final:</strong>{" "}
                            {isValidFileUrl(item.resultado_final_url) ? (
                              <a
                                href={getDownloadUrl(item.resultado_final_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="card__link"
                              >
                                {item.resultado_final_titulo}
                              </a>
                            ) : (
                              item.resultado_final_titulo
                            )}
                          </p>
                        )}

                        {item.homologacao_titulo && (
                          <p>
                            <strong>Homologação:</strong>{" "}
                            {isValidFileUrl(item.homologacao_url) ? (
                              <a
                               href={getDownloadUrl(item.homologacao_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="card__link"
                              >
                                {item.homologacao_titulo}
                              </a>
                            ) : (
                              item.homologacao_titulo
                            )}
                          </p>
                        )}

                        {item.contrato_titulo && (
                          <p>
                            <strong>Contrato:</strong>{" "}
                            {isValidFileUrl(item.contrato_url) ? (
                              <a
                                href={getDownloadUrl(item.contrato_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="card__link"
                              >
                                {item.contrato_titulo}
                              </a>
                            ) : (
                              item.contrato_titulo
                            )}
                          </p>
                        )}

                        {safeText(item.observacoes) && (
                          <p style={{ marginTop: 10 }}>
                            <strong>Observações:</strong> {item.observacoes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="sobre" aria-labelledby="prestacao-contas">
        <div className="container">
          <h2 id="prestacao-contas">{prestacao.titulo}</h2>
          <p>{prestacao.texto}</p>

          {prestacoesAgrupadas.length === 0 ? (
            <div className="cards__grid" style={{ marginTop: 16 }}>
              <article className="card">
                <div className="card__body">
                  <h3 className="card__title">Nenhuma prestação publicada</h3>
                  <p>
                    Ainda não há itens de prestação de contas vinculados aos convênios publicados.
                  </p>
                </div>
              </article>
            </div>
          ) : (
            <div className="cards__grid" style={{ marginTop: 16 }}>
              {prestacoesAgrupadas.map((grupo) => {
                const convenio = grupo.convenio;
                const fasesOrdenadas = ordenarFases(Object.keys(grupo.fases));

                return (
                  <article className="card" key={convenio.id}>
                    <div className="card__body">
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          paddingBottom: 16,
                          marginBottom: 18,
                          borderBottom: "1px solid rgba(15,23,42,0.08)",
                        }}
                      >
                        <h3 className="card__title" style={{ marginBottom: 4 }}>
                          {convenio.titulo || "Convênio / Instrumento"}
                        </h3>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          {safeText(convenio.numero_instrumento) && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "6px 12px",
                                borderRadius: 999,
                                background: "rgba(15,23,42,0.05)",
                                color: "#334155",
                                border: "1px solid rgba(15,23,42,0.08)",
                                fontSize: "0.82rem",
                                fontWeight: 700,
                              }}
                            >
                              Nº {convenio.numero_instrumento}
                            </span>
                          )}

                          {safeText(convenio.status) && (
                            <span style={getStatusBadgeStyle(convenio.status)}>
                              {convenio.status}
                            </span>
                          )}

                          {safeText(convenio.tipo_instrumento) && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "6px 12px",
                                borderRadius: 999,
                                background: "rgba(15,23,42,0.05)",
                                color: "#334155",
                                border: "1px solid rgba(15,23,42,0.08)",
                                fontSize: "0.82rem",
                                fontWeight: 700,
                              }}
                            >
                              {convenio.tipo_instrumento}
                            </span>
                          )}
                        </div>

                        {safeText(convenio.contratado) && (
                          <p>
                            <strong>Executante / contratado:</strong> {convenio.contratado}
                          </p>
                        )}

                        {(convenio.vigencia_inicio || convenio.vigencia_fim) && (
                          <p>
                            <strong>Vigência:</strong>{" "}
                            {convenio.vigencia_inicio ? formatDate(convenio.vigencia_inicio) : "—"} até{" "}
                            {convenio.vigencia_fim ? formatDate(convenio.vigencia_fim) : "—"}
                          </p>
                        )}
                      </div>

                    <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
    gap: 14,
    alignItems: "start",
  }}
>
       
                        {fasesOrdenadas.map((fase) => (
                          <div
                            key={`${convenio.id}-${fase}`}
                            style={{
                              borderRadius: 18,
                              border: "1px solid rgba(15,23,42,0.08)",
                              background: "#f8fafc",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                                flexWrap: "wrap",
                                padding: "14px 16px",
                                background: "rgba(15,23,42,0.04)",
                                borderBottom: "1px solid rgba(15,23,42,0.08)",
                              }}
                            >
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: "1rem",
                                  fontWeight: 800,
                                  color: "#0f172a",
                                }}
                              >
                                {fase}
                              </h4>

                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "6px 12px",
                                  borderRadius: 999,
                                  background: "white",
                                  color: "#475569",
                                  border: "1px solid rgba(15,23,42,0.10)",
                                  fontSize: "0.82rem",
                                  fontWeight: 700,
                                }}
                              >
                                {grupo.fases[fase].length} item{grupo.fases[fase].length > 1 ? "s" : ""}
                              </span>
                            </div>

                            <div style={{ display: "grid", gap: 0 }}>
                              {grupo.fases[fase].map((doc, idx) => {
                                const periodo = getPrestacaoPeriodo(doc);

                                return (
                                  <div
                                    key={doc.id}
                                    style={{
                                      padding: "16px",
                                      borderTop:
                                        idx === 0 ? "none" : "1px solid rgba(15,23,42,0.08)",
                                      background: "white",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 10,
                                        flexWrap: "wrap",
                                        marginBottom: 10,
                                      }}
                                    >
                                      <p
                                        style={{
                                          margin: 0,
                                          fontWeight: 800,
                                          color: "#0f172a",
                                        }}
                                      >
                                        {doc.tipo_documento || "Documento"}
                                      </p>

                                      {safeText(doc.status_prestacao) && (
                                        <span style={getStatusBadgeStyle(doc.status_prestacao)}>
                                          {doc.status_prestacao}
                                        </span>
                                      )}
                                    </div>

                                    {safeText(doc.documento_titulo) && (
                                      <p style={{ marginBottom: 8 }}>
                                        <strong>Título:</strong> {doc.documento_titulo}
                                      </p>
                                    )}

                                    {periodo && (
                                      <p style={{ marginBottom: 8 }}>
                                        <strong>Período de referência:</strong> {periodo}
                                      </p>
                                    )}

                                    {doc.documento_url && (
  <p style={{ marginBottom: 8 }}>
    <a
      href={getDownloadUrl(doc.documento_url)}
      target="_blank"
      rel="noreferrer"
      className="card__link"
    >
      Acessar documento
    </a>
  </p>
)}

                                    {safeText(doc.observacoes) && (
                                      <p style={{ marginBottom: 0 }}>
                                        <strong>Observações:</strong> {doc.observacoes}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="sobre-cta" aria-label="LGPD e integridade">
        <div className="container sobre-cta__grid">
          <div className="sobre">
            <h2>{lgpd.titulo}</h2>
            <p>{lgpd.texto}</p>
            <ListaLinks links={lgpd.links} />
          </div>

          <div className="cta-green__inner">
            <h3>{cta.titulo}</h3>
            <p>{cta.texto}</p>
            <a
             href={getDownloadUrl(cta.botaoUrl)}
              className="btn-cta"
              aria-label={cta.botaoLabel}
              target="_blank"
              rel="noreferrer"
            >
              {cta.botaoLabel}
            </a>

            {cta.ultimaAtualizacao && (
              <p style={{ marginTop: 10, opacity: 0.85, fontSize: "0.95rem" }}>
                Última atualização: {cta.ultimaAtualizacao}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
