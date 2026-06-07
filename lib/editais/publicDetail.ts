import { getDownloadUrl, isValidFileUrl } from "@/lib/storage";
import { editalStatusLabel } from "@/lib/editais/download";
import {
  editalAceitaEnvioProposta,
  getMensagemEnvioPropostaInstitucional,
} from "@/lib/editais/governancaRules";

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

export function labelFaseEdital(value?: string | null) {
  const clean = normalizarTextoEdital(value);
  if (!clean) return "";
  return FASE_LABELS[clean] || clean.replace(/_/g, " ");
}

export function labelTipoDocumentoEdital(value?: string | null) {
  const clean = normalizarTextoEdital(value);
  if (!clean) return "";
  return TIPO_DOCUMENTO_LABELS[clean] || clean.replace(/_/g, " ");
}

export function getDocumentoPublicoDownloadUrl(url?: string | null) {
  const clean = normalizarTextoEdital(url);
  if (!clean) return "";
  if (clean.startsWith("/api/download/")) return clean;
  if (isValidFileUrl(clean)) return getDownloadUrl(clean);
  return `/api/download/docs/${clean.replace(/^\/+/, "")}`;
}

export function podeEnviarProposta(edital: Pick<EditalPublicoDetalhe, "status" | "fase_atual">) {
  return editalAceitaEnvioProposta(edital);
}

export function getMensagemEnvioProposta(
  edital: Pick<EditalPublicoDetalhe, "status" | "fase_atual">
) {
  return getMensagemEnvioPropostaInstitucional(edital);
}

export function getFaseAtualPublica(edital: Pick<EditalPublicoDetalhe, "status" | "fase_atual">) {
  const fase = normalizarTextoEdital(edital.fase_atual);
  if (fase && fase !== "rascunho") return fase;

  const status = normalizarTextoEdital(edital.status);
  if (status === "aberto") return "recebimento_propostas";
  if (status === "encerrado") return "encerrado";
  if (status === "em_breve") return "publicado";

  return "publicado";
}

export function buildTimelinePublica(
  edital: Pick<EditalPublicoDetalhe, "status" | "fase_atual">,
  documentos: DocumentoPublicoEdital[]
): TimelineStep[] {
  const faseAtual = getFaseAtualPublica(edital);
  const indiceAtual = FASES_TIMELINE_PUBLICA.indexOf(
    faseAtual as (typeof FASES_TIMELINE_PUBLICA)[number]
  );
  const indiceBase = indiceAtual === -1 ? 0 : indiceAtual;

  return FASES_TIMELINE_PUBLICA.map((fase, index) => {
    const docsFase = documentos.filter(
      (doc) => normalizarTextoEdital(doc.fase) === fase
    );

    let estado: TimelineStep["estado"] = "futura";
    if (index < indiceBase) estado = "concluida";
    if (index === indiceBase) estado = "atual";
    if (faseAtual === "encerrado" && fase === "encerrado") estado = "atual";

    return {
      fase,
      label: labelFaseEdital(fase),
      resumo: FASE_RESUMO[fase] || "",
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
