export type GrupoChecklistId =
  | "habilitacao_juridica"
  | "regularidade_fiscal_trabalhista"
  | "qualificacao_tecnica"
  | "outros";

export type ItemChecklistDocumental = {
  key: string;
  label: string;
  path: string | null;
  origem: "coluna" | "mensagem";
};

export type CertidaoEntidade = {
  id: string;
  tipo_id: string;
  orgao_emissor: string;
  esfera: string;
  validade_ate: string;
  status: string;
  versao: number;
};

export type CertidaoEntidadeLinha = CertidaoEntidade & {
  tipo_nome: string;
};

export type StatusDocumentalAuto =
  | "documentacao_completa"
  | "documentacao_pendente"
  | "documentacao_irregular"
  | "em_analise";

export type DiagnosticoDocumental = {
  status: StatusDocumentalAuto;
  statusLabel: string;
  nucleoEncontrados: number;
  nucleoTotal: number;
  listaVerde: string[];
  listaLaranja: string[];
  listaVermelha: string[];
  alertasCertidoes: string[];
};

export type TipoPessoaDocumental = "pessoa_juridica" | "osc" | "pessoa_fisica";
