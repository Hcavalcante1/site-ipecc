-- Catálogo de tipos de documento (publicação + emissão oficial)
-- Additive. IF NOT EXISTS. Remove CHECKs rígidos para permitir criar tipos no admin.

CREATE TABLE IF NOT EXISTS public.documentos_tipos (
  codigo text PRIMARY KEY,
  label text NOT NULL,
  descricao text,
  para_publicacao boolean NOT NULL DEFAULT true,
  para_emissao boolean NOT NULL DEFAULT false,
  para_prestacao boolean NOT NULL DEFAULT false,
  tipo_publicacao_padrao text,
  ativo boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documentos_tipos_codigo_fmt CHECK (
    codigo ~ '^[a-z][a-z0-9_]{1,62}$'
  )
);

CREATE INDEX IF NOT EXISTS documentos_tipos_ativo_idx
  ON public.documentos_tipos (ativo, sort_order, label);

-- Bancos que já tinham a tabela sem a coluna
ALTER TABLE public.documentos_tipos
  ADD COLUMN IF NOT EXISTS para_prestacao boolean NOT NULL DEFAULT false;

COMMENT ON TABLE public.documentos_tipos IS
  'Tipos de documento criáveis no admin (governança / publicação / emissão / prestação).';

-- Seeds: tipos de publicação existentes + novos pedidos (ata, declaração, nota…)
INSERT INTO public.documentos_tipos
  (codigo, label, para_publicacao, para_emissao, para_prestacao, tipo_publicacao_padrao, sort_order)
VALUES
  ('edital', 'Edital', true, false, false, null, 10),
  ('anexo', 'Anexo', true, false, false, null, 20),
  ('ata', 'Ata', true, true, false, 'ata', 30),
  ('parecer', 'Parecer', true, false, true, null, 40),
  ('recurso', 'Recurso', true, false, false, null, 50),
  ('julgamento', 'Julgamento', true, false, false, null, 60),
  ('resultado_preliminar', 'Resultado preliminar', true, false, false, null, 70),
  ('resultado_final', 'Resultado final', true, false, false, null, 80),
  ('homologacao', 'Homologação', true, true, false, 'homologacao', 90),
  ('adjudicacao', 'Adjudicação', true, false, false, null, 100),
  ('contrato', 'Contrato', true, true, false, 'contrato', 110),
  ('termo_parceria', 'Termo de parceria', true, false, false, null, 120),
  ('prestacao_de_contas', 'Prestação de contas', true, false, true, null, 130),
  ('encerramento', 'Encerramento', true, false, true, null, 140),
  ('declaracao', 'Declaração', true, true, false, 'declaracao', 150),
  ('nota_esclarecimento', 'Nota de esclarecimento', true, true, false, 'nota_esclarecimento', 160),
  ('esclarecimento', 'Esclarecimento', true, false, false, null, 170),
  ('edital_cotacao', 'Edital de cotação prévia', false, true, false, 'edital', 5),
  ('edital_chamamento', 'Edital de chamamento público', false, true, false, 'edital', 6),
  ('ata_selecao', 'Ata de seleção / análise', false, true, false, 'ata', 35),
  -- Prestação de contas (CMS) — labels legíveis já usados no admin
  ('plano_de_trabalho', 'Plano de trabalho', false, true, true, null, 200),
  ('relatorio_tecnico_parcial', 'Relatório técnico parcial', false, false, true, null, 210),
  ('relatorio_financeiro_parcial', 'Relatório financeiro parcial', false, false, true, null, 220),
  ('relatorio_tecnico_final', 'Relatório técnico final', false, false, true, null, 230),
  ('relatorio_financeiro_final', 'Relatório financeiro final', false, false, true, null, 240),
  ('parecer_tecnico', 'Parecer técnico', false, false, true, null, 250),
  ('parecer_contabil', 'Parecer contábil', false, false, true, null, 260),
  ('termo_de_aprovacao', 'Termo de aprovação', false, false, true, null, 270),
  ('termo_de_encerramento', 'Termo de encerramento', false, false, true, null, 280),
  ('documento_complementar', 'Documento complementar', false, false, true, null, 290),
  ('oficio', 'Ofício', false, true, false, null, 300),
  ('relatorio', 'Relatório', false, true, true, null, 310),
  ('convenio', 'Convênio', false, true, false, null, 320)
ON CONFLICT (codigo) DO UPDATE SET
  label = EXCLUDED.label,
  para_publicacao = EXCLUDED.para_publicacao OR public.documentos_tipos.para_publicacao,
  para_emissao = EXCLUDED.para_emissao OR public.documentos_tipos.para_emissao,
  para_prestacao = EXCLUDED.para_prestacao OR public.documentos_tipos.para_prestacao,
  tipo_publicacao_padrao = COALESCE(
    public.documentos_tipos.tipo_publicacao_padrao,
    EXCLUDED.tipo_publicacao_padrao
  ),
  updated_at = now();

-- Remover CHECKs rígidos: validação passa pelo catálogo + aplicação
ALTER TABLE public.documentos_publicos
  DROP CONSTRAINT IF EXISTS documentos_publicos_tipo_check;

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'documentos_oficiais_modelos'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%tipo_emissao%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.documentos_oficiais_modelos DROP CONSTRAINT IF EXISTS %I',
      cname
    );
  END LOOP;

  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'documentos_oficiais_modelos'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%tipo_publicacao%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.documentos_oficiais_modelos DROP CONSTRAINT IF EXISTS %I',
      cname
    );
  END LOOP;
END $$;

-- Modelos padrão para novos tipos de emissão (idempotente por slug)
INSERT INTO public.documentos_oficiais_modelos
  (slug, titulo, tipo_emissao, tipo_publicacao, modalidade, fase_minima, corpo_texto)
VALUES
(
  'declaracao-institucional',
  'Declaração institucional',
  'declaracao',
  'declaracao',
  'qualquer',
  'rascunho',
  $txt$O INSTITUTO PAULISTA DE ESTUDOS, CULTURA E CIDADANIA – IPECC DECLARA, para os devidos fins,

1. IDENTIFICAÇÃO
Título / processo: {{titulo}}
Tipo: {{tipo}}
Fase: {{fase}}
Data: {{data}}

2. OBJETO / CONTEÚDO
{{objeto}}

3. DISPOSIÇÕES FINAIS
Esta declaração foi gerada pelo sistema de governança do IPECC e submetida a assinatura eletrônica institucional antes da publicação.$txt$
),
(
  'nota-esclarecimento',
  'Nota de esclarecimento',
  'nota_esclarecimento',
  'nota_esclarecimento',
  'qualquer',
  'publicado',
  $txt$O INSTITUTO PAULISTA DE ESTUDOS, CULTURA E CIDADANIA – IPECC publica a presente Nota de Esclarecimento.

1. PROCESSO
Título: {{titulo}}
Tipo: {{tipo}}
Período: {{periodo}}
Fase: {{fase}}
Data: {{data}}

2. ESCLARECIMENTO
{{objeto}}

3. DISPOSIÇÕES FINAIS
Documento gerado digitalmente e publicado somente após assinatura institucional.$txt$
),
(
  'ata-generica',
  'Ata',
  'ata',
  'ata',
  'qualquer',
  'rascunho',
  $txt$ATA

Processo: {{titulo}}
Tipo: {{tipo}}
Fase: {{fase}}
Data: {{data}}

1. OBJETO
{{objeto}}

2. DELIBERAÇÕES / REGISTRO
{{propostas}}

3. ENCERRAMENTO
Documento gerado pelo sistema de governança do IPECC e submetido a assinatura eletrônica antes da publicação.$txt$
)
ON CONFLICT (slug) DO NOTHING;

-- GD modelos: permitir kinds novos do catálogo (remove CHECK rígido)
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'gd_document_templates'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%kind%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.gd_document_templates DROP CONSTRAINT IF EXISTS %I',
      cname
    );
  END LOOP;
END $$;
