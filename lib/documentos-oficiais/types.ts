/** Tipos do gerador de documentos oficiais (gerar → assinar → publicar). */

export const TIPOS_EMISSAO_OFICIAL = [
  "edital_cotacao",
  "edital_chamamento",
  "ata_selecao",
  "homologacao",
  "contrato",
] as const;

export type TipoEmissaoOficial = (typeof TIPOS_EMISSAO_OFICIAL)[number];

export function isTipoEmissaoOficial(v: string): v is TipoEmissaoOficial {
  return (TIPOS_EMISSAO_OFICIAL as readonly string[]).includes(v);
}

export const LABEL_TIPO_EMISSAO: Record<TipoEmissaoOficial, string> = {
  edital_cotacao: "Edital de cotação prévia de preços",
  edital_chamamento: "Edital de chamamento público",
  ata_selecao: "Ata de seleção / análise",
  homologacao: "Homologação",
  contrato: "Contrato / termo",
};

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
