import { FASE_LABELS, labelFaseEdital } from "@/lib/editais/publicDetail";

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

export { FASE_LABELS, labelFaseEdital as labelFaseAdmin };
