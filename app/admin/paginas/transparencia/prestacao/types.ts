export type Convenio = {
  id?: string;
  processo_id?: string | null;
  titulo?: string | null;
  numero_instrumento?: string | null;
  tipo_instrumento?: string | null;
  contratado?: string | null;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  status?: string | null;
};

export type PrestacaoConta = {
  id?: string;
  convenio_id?: string | null;
  processo_id?: string | null;
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
};

export type LoadingOperationType = 'save' | 'delete' | 'upload' | null;