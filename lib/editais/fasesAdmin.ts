import {
  FASE_LABELS,
  FASES_TIMELINE_COTACAO_PREVIA,
  labelFaseEdital,
  normalizarFaseParaTimeline,
} from "@/lib/editais/publicDetail";
import { isModalidadeCotacaoPrevia } from "@/lib/editais/tiposAdmin";

export const FASES_GOVERNANCA = [
  "rascunho",
  "publicado",
  "recebimento_propostas",
  "analise",
  "resultado_preliminar",
  "recurso",
  "julgamento_recurso",
  "resultado_final",
  "homologado",
  "adjudicado",
  "contratado",
  "execucao",
  "prestacao_contas",
  "encerrado",
] as const;

export const FASES_GOVERNANCA_COTACAO_PREVIA = [
  "rascunho",
  ...FASES_TIMELINE_COTACAO_PREVIA,
] as const;

export function getFasesGovernancaAdmin(tipo?: string | null): readonly string[] {
  return isModalidadeCotacaoPrevia(tipo)
    ? FASES_GOVERNANCA_COTACAO_PREVIA
    : FASES_GOVERNANCA;
}

/** Se a fase atual nao existe na modalidade, mapeia para a mais proxima valida. */
export function sincronizarFaseComModalidade(
  faseAtual?: string | null,
  tipo?: string | null
): string {
  const fases = getFasesGovernancaAdmin(tipo);
  const fase = String(faseAtual ?? "").trim() || "rascunho";
  if (fases.includes(fase)) return fase;

  const timeline = fases.filter((f) => f !== "rascunho");
  const normalizada = normalizarFaseParaTimeline(fase, timeline);
  return fases.includes(normalizada) ? normalizada : "rascunho";
}

export function indiceFaseGovernancaAdmin(
  faseAtual?: string | null,
  tipo?: string | null
): number {
  const fases = getFasesGovernancaAdmin(tipo);
  const fase = String(faseAtual ?? "").trim();
  if (!fase) return 0;

  const direto = fases.indexOf(fase);
  if (direto >= 0) return direto;

  const timeline = fases.filter((f) => f !== "rascunho");
  const normalizada = normalizarFaseParaTimeline(fase, timeline);
  const idx = fases.indexOf(normalizada);
  return idx >= 0 ? idx : 0;
}

export function labelFaseAdmin(fase?: string | null, tipo?: string | null) {
  return labelFaseEdital(fase, tipo);
}

export { FASE_LABELS, FASES_TIMELINE_COTACAO_PREVIA };
