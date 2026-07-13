/** Tipos do gerador de documentos oficiais (gerar → assinar → publicar). */

/** Seeds iniciais — novos tipos vêm do catálogo documentos_tipos. */
export const TIPOS_EMISSAO_OFICIAL = [
  "edital_cotacao",
  "edital_chamamento",
  "ata_selecao",
  "ata",
  "homologacao",
  "contrato",
  "declaracao",
  "nota_esclarecimento",
] as const;

export type TipoEmissaoOficial = string;

export function isTipoEmissaoOficial(v: string): v is TipoEmissaoOficial {
  return Boolean(String(v || "").trim());
}

export const LABEL_TIPO_EMISSAO: Record<string, string> = {
  edital_cotacao: "Edital de cotação prévia de preços",
  edital_chamamento: "Edital de chamamento público",
  ata_selecao: "Ata de seleção / análise",
  ata: "Ata",
  homologacao: "Homologação",
  contrato: "Contrato / termo",
  declaracao: "Declaração",
  nota_esclarecimento: "Nota de esclarecimento",
};

export function labelTipoEmissao(tipo: string): string {
  const t = String(tipo || "").trim();
  return LABEL_TIPO_EMISSAO[t] || t.replace(/_/g, " ");
}

export const STATUS_EMISSAO = [
  "gerado",
  "aguardando_assinatura",
  "assinado",
  "publicado",
  "erro_assinatura",
  "erro_publicacao",
] as const;

export type StatusEmissaoOficial = (typeof STATUS_EMISSAO)[number];

export type DadosEditalParaPdf = {
  titulo: string;
  tipo: string;
  objeto: string;
  periodo: string;
  periodo_envio: string;
  fase: string;
  data: string;
  propostas: string;
};

export type SignatarioInput = {
  nome: string;
  email: string;
};
