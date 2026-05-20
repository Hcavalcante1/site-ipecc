import type { GrupoChecklistId, StatusDocumentalAuto, TipoPessoaDocumental } from "./types";

export const GRUPOS_CHECKLIST: { id: GrupoChecklistId; titulo: string }[] = [
  { id: "habilitacao_juridica", titulo: "Habilitação jurídica e institucional" },
  {
    id: "regularidade_fiscal_trabalhista",
    titulo: "Regularidade fiscal e trabalhista",
  },
  { id: "qualificacao_tecnica", titulo: "Qualificação técnica e operacional" },
  { id: "outros", titulo: "Outros anexos / documentos complementares" },
];

export const CHAVES_POR_GRUPO: Record<GrupoChecklistId, string[]> = {
  habilitacao_juridica: [
    "proposta",
    "contrato_social",
    "estatuto",
    "ata_posse",
    "cnpj",
    "doc_representante",
    "doc_pessoal",
    "cpf",
    "comprovante_residencia",
    "procuracao",
    "declaracao_consolidada_edital",
    "declaracao_ciencia_edital",
    "alvara",
  ],
  regularidade_fiscal_trabalhista: [
    "certidao_federal",
    "certidao_estadual",
    "certidao_municipal",
    "fgts",
    "cndt",
    "certidao_falencia",
    "certidao_inss",
    "certidao_tce",
    "certidao_tcu",
    "certidao_cnciai",
    "cadin",
  ],
  qualificacao_tecnica: [
    "plano_trabalho",
    "portfolio",
    "atestado_tecnico",
    "qualificacao_tecnica",
    "equipe_tecnica",
    "relatorios",
    "formacao",
    "registro_profissional",
    "balanco_patrimonial",
    "demonstracoes_financeiras",
    "crea_art",
    "licenca_sanitaria",
    "licenca_ambiental",
    "cat",
    "indices_financeiros",
    "declaracao_capacidade",
  ],
  outros: [],
};

export const COLUNA_URL_POR_CHAVE: Record<string, string> = {
  proposta: "arquivo_url",
  cnpj: "cnpj_url",
  contrato_social: "contrato_social_url",
  estatuto: "estatuto_url",
  ata_posse: "ata_posse_url",
  doc_pessoal: "doc_pessoal_url",
  doc_representante: "doc_representante_url",
  procuracao: "procuracao_url",
  certidao_federal: "certidao_federal_url",
  certidao_estadual: "certidao_estadual_url",
  certidao_municipal: "certidao_municipal_url",
  fgts: "fgts_url",
  cndt: "cndt_url",
  atestado_tecnico: "atestado_tecnico_url",
  qualificacao_tecnica: "qualificacao_tecnica_url",
  equipe_tecnica: "equipe_tecnica_url",
  portfolio: "portfolio_url",
  formacao: "formacao_url",
  registro_profissional: "registro_profissional_url",
  comprovante_residencia: "comprovante_residencia_url",
  cpf: "cpf_url",
};

export const CORES_STATUS_DOCUMENTAL: Record<
  StatusDocumentalAuto,
  { bg: string; border: string; color: string }
> = {
  documentacao_completa: {
    bg: "rgba(34,197,94,0.15)",
    border: "1px solid rgba(34,197,94,0.35)",
    color: "#86efac",
  },
  documentacao_pendente: {
    bg: "rgba(249,115,22,0.12)",
    border: "1px solid rgba(249,115,22,0.35)",
    color: "#fdba74",
  },
  documentacao_irregular: {
    bg: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "#fca5a5",
  },
  em_analise: {
    bg: "rgba(234,179,8,0.12)",
    border: "1px solid rgba(234,179,8,0.35)",
    color: "#fde047",
  },
};

export const NUCLEO_POR_TIPO: Record<TipoPessoaDocumental, string[]> = {
  pessoa_fisica: ["proposta", "doc_pessoal", "cpf"],
  osc: [
    "proposta",
    "estatuto",
    "ata_posse",
    "cnpj",
    "doc_representante",
    "certidao_federal",
    "fgts",
    "cndt",
    "plano_trabalho",
  ],
  pessoa_juridica: [
    "proposta",
    "contrato_social",
    "cnpj",
    "doc_representante",
    "certidao_federal",
    "fgts",
    "cndt",
  ],
};

export const CHAVES_CERTIDAO_NUCLEO = ["certidao_federal", "fgts", "cndt"];

export const PADROES_TIPO_CERTIDAO: Record<string, string[]> = {
  certidao_federal: ["federal", "rfb", "pgfn", "união", "uniao", "tributos"],
  fgts: ["fgts", "crf"],
  cndt: ["cndt", "trabalhist"],
};
