-- Documentos oficiais: gerar → assinar → publicar
-- Additive. IF NOT EXISTS. Sem DROP.

CREATE TABLE IF NOT EXISTS public.documentos_oficiais_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  tipo_emissao text NOT NULL
    CHECK (tipo_emissao IN (
      'edital_cotacao', 'edital_chamamento', 'ata_selecao',
      'homologacao', 'contrato'
    )),
  tipo_publicacao text NOT NULL
    CHECK (tipo_publicacao IN (
      'edital', 'ata', 'homologacao', 'contrato', 'termo_parceria',
      'resultado_final'
    )),
  modalidade text
    CHECK (modalidade IS NULL OR modalidade IN (
      'cotacao_previa', 'chamamento', 'qualquer'
    )),
  fase_minima text,
  corpo_texto text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentos_oficiais_emissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edital_id uuid NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  tipo_emissao text NOT NULL,
  tipo_publicacao text NOT NULL,
  titulo text NOT NULL,
  status text NOT NULL DEFAULT 'gerado'
    CHECK (status IN (
      'gerado', 'aguardando_assinatura', 'assinado',
      'publicado', 'erro_assinatura', 'erro_publicacao'
    )),
  gd_document_id uuid,
  gd_version_id uuid,
  signature_document_id uuid,
  documento_publico_id uuid,
  storage_path_gerado text,
  storage_path_assinado text,
  arquivo_url_publico text,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  publicado_em timestamptz
);

CREATE INDEX IF NOT EXISTS documentos_oficiais_emissoes_edital_idx
  ON public.documentos_oficiais_emissoes (edital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS documentos_oficiais_emissoes_sig_idx
  ON public.documentos_oficiais_emissoes (signature_document_id)
  WHERE signature_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS documentos_oficiais_emissoes_gd_idx
  ON public.documentos_oficiais_emissoes (gd_document_id)
  WHERE gd_document_id IS NOT NULL;

COMMENT ON TABLE public.documentos_oficiais_emissoes IS
  'Ciclo gerar → assinar → publicar documentos oficiais do edital.';

-- Seeds (idempotente por slug)
INSERT INTO public.documentos_oficiais_modelos
  (slug, titulo, tipo_emissao, tipo_publicacao, modalidade, fase_minima, corpo_texto)
VALUES
(
  'edital-cotacao-previa',
  'Edital de Cotação Prévia de Preços',
  'edital_cotacao',
  'edital',
  'cotacao_previa',
  'rascunho',
  $txt$O INSTITUTO PAULISTA DE ESTUDOS, CULTURA E CIDADANIA – IPECC torna público o presente Edital de Cotação Prévia de Preços.

1. OBJETO
{{objeto}}

2. PROCESSO / IDENTIFICAÇÃO
Título: {{titulo}}
Tipo: {{tipo}}
Período: {{periodo}}
Recebimento de propostas: {{periodo_envio}}

3. CONDIÇÕES
As propostas deverão observar as condições deste edital e a legislação aplicável.

4. DISPOSIÇÕES FINAIS
Este documento foi gerado pelo sistema de governança do IPECC e submetido a assinatura eletrônica institucional antes da publicação.$txt$
),
(
  'edital-chamamento-publico',
  'Edital de Chamamento Público',
  'edital_chamamento',
  'edital',
  'chamamento',
  'rascunho',
  $txt$O INSTITUTO PAULISTA DE ESTUDOS, CULTURA E CIDADANIA – IPECC torna público o presente Edital de Chamamento Público.

1. OBJETO
{{objeto}}

2. IDENTIFICAÇÃO
Título: {{titulo}}
Tipo: {{tipo}}
Período: {{periodo}}
Recebimento de propostas: {{periodo_envio}}

3. CRITÉRIOS E PROCEDIMENTOS
As organizações interessadas deverão observar as regras deste edital.

4. DISPOSIÇÕES FINAIS
Documento gerado digitalmente e publicado somente após assinatura institucional.$txt$
),
(
  'ata-selecao',
  'Ata de Seleção / Análise',
  'ata_selecao',
  'ata',
  'qualquer',
  'analise',
  $txt$ATA DE SELEÇÃO / ANÁLISE TÉCNICA

Edital: {{titulo}}
Fase: {{fase}}
Data: {{data}}

1. OBJETO DA ANÁLISE
{{objeto}}

2. PROPOSTAS CONSIDERADAS
{{propostas}}

3. DELIBERAÇÃO
A comissão registra a análise conforme critérios do edital.

4. ENCERRAMENTO
Nada mais havendo a tratar, lavrou-se a presente ata.$txt$
),
(
  'homologacao-resultado',
  'Termo de Homologação',
  'homologacao',
  'homologacao',
  'qualquer',
  'homologado',
  $txt$TERMO DE HOMOLOGAÇÃO

O IPECC homologa o resultado do processo abaixo:

Edital: {{titulo}}
Tipo: {{tipo}}
Fase: {{fase}}
Data: {{data}}

Objeto: {{objeto}}

Propostas / participantes considerados:
{{propostas}}

A homologação é publicada após assinatura institucional.$txt$
),
(
  'contrato-termo',
  'Minuta de Contrato / Termo',
  'contrato',
  'contrato',
  'qualquer',
  'contratado',
  $txt$MINUTA DE CONTRATO / TERMO DE PARCERIA

Partes: IPECC e proponente selecionado no edital {{titulo}}.

1. OBJETO
{{objeto}}

2. FUNDAMENTO
Processo e edital: {{titulo}} ({{tipo}}).
Fase: {{fase}}.
Data: {{data}}.

3. OBRIGAÇÕES
As partes cumprirão as cláusulas do edital e a legislação aplicável.

4. VIGÊNCIA E PUBLICIDADE
Este instrumento é gerado no sistema e publicado somente após assinatura.$txt$
)
ON CONFLICT (slug) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  corpo_texto = EXCLUDED.corpo_texto,
  tipo_publicacao = EXCLUDED.tipo_publicacao,
  modalidade = EXCLUDED.modalidade,
  fase_minima = EXCLUDED.fase_minima,
  updated_at = now(),
  ativo = true;
