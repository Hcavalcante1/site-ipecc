import { getDownloadUrl, isValidFileUrl } from "@/lib/storage";
import { editalStatusLabel } from "@/lib/editais/download";
import {
  editalAceitaEnvioProposta,
  getMensagemEnvioPropostaInstitucional,
} from "@/lib/editais/governancaRules";
import { isModalidadeCotacaoPrevia } from "@/lib/editais/tiposAdmin";
import { labelTipoDocumento as labelTipoDocumentoCatalogo } from "@/lib/editais/documentosTipos";

export type EditalPublicoDetalhe = {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo?: string | null;
  periodo?: string | null;
  periodo_envio?: string | null;
  status: string;
  arquivo_pdf?: string | null;
  fase_atual?: string | null;
  publicado_em?: string | null;
  recebimento_inicio?: string | null;
  recebimento_fim?: string | null;
  created_at?: string | null;
};

export type DocumentoPublicoEdital = {
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

export const FASE_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicação",
  recebimento_propostas: "Recebimento de propostas",
  analise: "Análise técnica",
  resultado_preliminar: "Resultado preliminar",
  recurso: "Recursos",
  julgamento_recurso: "Julgamento dos recursos",
  resultado_final: "Resultado final",
  homologado: "Homologação",
  adjudicado: "Adjudicação",
  contratado: "Contrato / termo",
  execucao: "Execução",
  prestacao_contas: "Prestação de contas",
  encerrado: "Encerramento",
};

export const FASES_TIMELINE_PUBLICA = [
  "publicado",
  "recebimento_propostas",
  "analise",
  "resultado_preliminar",
  "recurso",
  "julgamento_recurso",
  "resultado_final",
  "homologado",
  "contratado",
  "execucao",
  "prestacao_contas",
  "encerrado",
] as const;

/** Fluxo enxuto para Cotação prévia de preços (público e admin). */
export const FASES_TIMELINE_COTACAO_PREVIA = [
  "publicado",
  "recebimento_propostas",
  "analise",
  "resultado_final",
  "encerrado",
] as const;

const FASE_COTACAO_ALIASES: Record<
  string,
  (typeof FASES_TIMELINE_COTACAO_PREVIA)[number]
> = {
  resultado_preliminar: "analise",
  recurso: "analise",
  julgamento_recurso: "analise",
  homologado: "resultado_final",
  adjudicado: "resultado_final",
  contratado: "resultado_final",
  execucao: "resultado_final",
  prestacao_contas: "resultado_final",
};

const FASE_RESUMO: Record<string, string> = {
  publicado: "Edital publicado oficialmente pelo IPECC.",
  recebimento_propostas:
    "Organizações e proponentes podem enviar propostas dentro do prazo informado.",
  analise:
    "As propostas recebidas estão em análise pela equipe responsável, conforme critérios do edital.",
  resultado_preliminar:
    "Divulgação do resultado preliminar e documentos oficiais da etapa.",
  recurso: "Período para apresentação de recursos, quando aplicável.",
  julgamento_recurso:
    "Análise institucional dos recursos recebidos e publicação dos documentos.",
  resultado_final: "Publicação do resultado final do processo.",
  homologado: "Homologação do resultado conforme trâmite institucional.",
  adjudicado: "Adjudicação do objeto ou parceria selecionada.",
  contratado: "Formalização de contrato ou termo de parceria.",
  execucao: "Acompanhamento da execução do objeto ou parceria.",
  prestacao_contas: "Prestação de contas e documentos de encerramento.",
  encerrado: "Processo encerrado institucionalmente.",
};

const FASE_RESUMO_COTACAO: Record<string, string> = {
  publicado: "Cotação prévia publicada pelo IPECC.",
  recebimento_propostas:
    "Fornecedores podem enviar cotações dentro do prazo informado.",
  analise: "As cotações recebidas estão em análise pela equipe responsável.",
  resultado_final: "Divulgação do resultado da cotação prévia.",
  encerrado: "Cotação prévia encerrada.",
};

const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  edital: "Edital",
  anexo: "Anexo",
  ata: "Ata",
  parecer: "Parecer",
  recurso: "Recurso",
  julgamento: "Julgamento",
  resultado_preliminar: "Resultado preliminar",
  resultado_final: "Resultado final",
  homologacao: "Homologação",
  adjudicacao: "Adjudicação",
  contrato: "Contrato",
  termo_parceria: "Termo de parceria",
  prestacao_de_contas: "Prestação de contas",
  encerramento: "Encerramento",
};

export type TimelineStep = {
  fase: string;
  label: string;
  resumo: string;
  estado: "concluida" | "atual" | "futura";
  documentos: DocumentoPublicoEdital[];
};

export function normalizarTextoEdital(valor?: string | null) {
  return valor?.trim() ?? "";
}

export function getFasesTimelinePublica(tipo?: string | null): readonly string[] {
  return isModalidadeCotacaoPrevia(tipo)
    ? FASES_TIMELINE_COTACAO_PREVIA
    : FASES_TIMELINE_PUBLICA;
}

export function normalizarFaseParaTimeline(
  faseAtual: string | null | undefined,
  timeline: readonly string[]
): string {
  const fase = normalizarTextoEdital(faseAtual);
  if (!fase) return timeline[0] || "publicado";
  if (timeline.includes(fase)) return fase;

  const alias = FASE_COTACAO_ALIASES[fase];
  if (alias && timeline.includes(alias)) return alias;

  const ordemCompleta = ["rascunho", ...FASES_TIMELINE_PUBLICA];
  const fullIdx = ordemCompleta.indexOf(fase);
  if (fullIdx < 0) return timeline[0] || "publicado";

  let best = timeline[0] || "publicado";
  for (const etapa of timeline) {
    const ti = ordemCompleta.indexOf(etapa);
    if (ti >= 0 && ti <= fullIdx) best = etapa;
  }
  return best;
}

export function indiceFaseNaTimeline(
  faseAtual: string | null | undefined,
  timeline: readonly string[]
): number {
  const normalizada = normalizarFaseParaTimeline(faseAtual, timeline);
  const idx = timeline.indexOf(normalizada);
  return idx >= 0 ? idx : 0;
}

export function getProximaFaseTimeline(
  faseAtual: string | null | undefined,
  tipo?: string | null
): string {
  const timeline = getFasesTimelinePublica(tipo);
  const idx = indiceFaseNaTimeline(faseAtual, timeline);
  return timeline[idx + 1] || "";
}

export function descricaoDiferenteDoTitulo(titulo: string, descricao: string) {
  if (!descricao) return false;
  return (
    descricao.localeCompare(titulo, "pt-BR", { sensitivity: "accent" }) !== 0
  );
}

export function formatDateEdital(dateString?: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function labelFaseEdital(value?: string | null, tipo?: string | null) {
  const clean = normalizarTextoEdital(value);
  if (!clean) return "";
  if (isModalidadeCotacaoPrevia(tipo) && clean === "recebimento_propostas") {
    return "Recebimento de cotações";
  }
  return FASE_LABELS[clean] || clean.replace(/_/g, " ");
}

export function labelTipoDocumentoEdital(value?: string | null) {
  const clean = normalizarTextoEdital(value);
  if (!clean) return "";
  return (
    labelTipoDocumentoCatalogo(clean) ||
    TIPO_DOCUMENTO_LABELS[clean] ||
    clean.replace(/_/g, " ")
  );
}

export function getDocumentoPublicoDownloadUrl(url?: string | null) {
  const clean = normalizarTextoEdital(url);
  if (!clean) return "";
  if (clean.startsWith("/api/download/")) return clean;
  if (isValidFileUrl(clean)) return getDownloadUrl(clean);
  return `/api/download/docs/${clean.replace(/^\/+/, "")}`;
}

export function podeEnviarProposta(
  edital: Pick<EditalPublicoDetalhe, "status" | "fase_atual">
) {
  return editalAceitaEnvioProposta(edital);
}

export function getMensagemEnvioProposta(
  edital: Pick<EditalPublicoDetalhe, "status" | "fase_atual">
) {
  return getMensagemEnvioPropostaInstitucional(edital);
}

export function getFaseAtualPublica(
  edital: Pick<EditalPublicoDetalhe, "status" | "fase_atual">
) {
  const fase = normalizarTextoEdital(edital.fase_atual);
  if (fase && fase !== "rascunho") return fase;

  const status = normalizarTextoEdital(edital.status);
  if (status === "aberto") return "recebimento_propostas";
  if (status === "encerrado") return "encerrado";
  if (status === "em_breve") return "publicado";

  return "publicado";
}

export function buildTimelinePublica(
  edital: Pick<EditalPublicoDetalhe, "status" | "fase_atual" | "tipo">,
  documentos: DocumentoPublicoEdital[]
): TimelineStep[] {
  const timeline = getFasesTimelinePublica(edital.tipo);
  const faseAtualBruta = getFaseAtualPublica(edital);
  const faseAtual = normalizarFaseParaTimeline(faseAtualBruta, timeline);
  const indiceBase = indiceFaseNaTimeline(faseAtual, timeline);
  const cotacao = isModalidadeCotacaoPrevia(edital.tipo);

  return timeline.map((fase, index) => {
    const docsFase = documentos.filter(
      (doc) => normalizarTextoEdital(doc.fase) === fase
    );

    let estado: TimelineStep["estado"] = "futura";
    if (index < indiceBase) estado = "concluida";
    if (index === indiceBase) estado = "atual";
    if (faseAtual === "encerrado" && fase === "encerrado") estado = "atual";

    const resumo = cotacao
      ? FASE_RESUMO_COTACAO[fase] || FASE_RESUMO[fase] || ""
      : FASE_RESUMO[fase] || "";

    return {
      fase,
      label: labelFaseEdital(fase, edital.tipo),
      resumo,
      estado,
      documentos: docsFase,
    };
  });
}

export function resumoPeriodoRecebimento(edital: EditalPublicoDetalhe) {
  const inicio = formatDateEdital(edital.recebimento_inicio);
  const fim = formatDateEdital(edital.recebimento_fim);

  if (inicio && fim) return `${inicio} a ${fim}`;

  return (
    normalizarTextoEdital(edital.periodo_envio) ||
    normalizarTextoEdital(edital.periodo) ||
    "Consulte o PDF oficial do edital"
  );
}

export function resumoStatusPublico(edital: EditalPublicoDetalhe) {
  return editalStatusLabel(
    edital.status as "aberto" | "encerrado" | "em_breve"
  );
}
