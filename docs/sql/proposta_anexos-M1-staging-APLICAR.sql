-- =============================================================================
-- M1 — Aplicar SOMENTE no Supabase de STAGING/DEV
-- Projeto: IPECC · Tabela proposta_anexos + migração legado
-- Antes: npm run audit:anexos (anotar total de referências)
-- Depois: npm run audit:anexos + npm run verify:proposta-anexos (se disponível)
-- Rollback staging: TRUNCATE public.proposta_anexos;
-- =============================================================================

-- PASSO 1 — Tabela e índices
CREATE TABLE IF NOT EXISTS public.proposta_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  chave text NOT NULL,
  label text,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'substituido', 'removido')),
  origem text NOT NULL DEFAULT 'legado'
    CHECK (origem IN ('legado', 'upload_publico', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposta_id, chave, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_proposta_anexos_proposta_id
  ON public.proposta_anexos (proposta_id);

CREATE INDEX IF NOT EXISTS idx_proposta_anexos_storage_path
  ON public.proposta_anexos (storage_path);

CREATE INDEX IF NOT EXISTS idx_proposta_anexos_status
  ON public.proposta_anexos (status)
  WHERE status = 'ativo';

-- PASSO 2 — Trigger updated_at (opcional)
CREATE OR REPLACE FUNCTION public.set_updated_at_proposta_anexos()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposta_anexos_updated_at ON public.proposta_anexos;
CREATE TRIGGER trg_proposta_anexos_updated_at
  BEFORE UPDATE ON public.proposta_anexos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_proposta_anexos();

-- PASSO 3 — RLS (ajuste se is_admin no seu projeto usar outra assinatura)
ALTER TABLE public.proposta_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposta_anexos_select_admin" ON public.proposta_anexos;
DROP POLICY IF EXISTS "proposta_anexos_insert_admin" ON public.proposta_anexos;
DROP POLICY IF EXISTS "proposta_anexos_update_admin" ON public.proposta_anexos;
DROP POLICY IF EXISTS "proposta_anexos_delete_admin" ON public.proposta_anexos;

CREATE POLICY "proposta_anexos_select_admin"
  ON public.proposta_anexos FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "proposta_anexos_insert_admin"
  ON public.proposta_anexos FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "proposta_anexos_update_admin"
  ON public.proposta_anexos FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "proposta_anexos_delete_admin"
  ON public.proposta_anexos FOR DELETE
  USING (public.is_admin(auth.uid()));

-- PASSO 4 — Migração legado (uma vez)
INSERT INTO public.proposta_anexos (proposta_id, chave, label, storage_path, origem)
SELECT
  p.id,
  v.chave,
  v.label,
  trim(v.path),
  'legado'
FROM public.propostas p
CROSS JOIN LATERAL (
  VALUES
    ('arquivo_url', 'Proposta', p.arquivo_url),
    ('cnpj_url', 'CNPJ', p.cnpj_url),
    ('contrato_social_url', 'Contrato Social', p.contrato_social_url),
    ('estatuto_url', 'Estatuto', p.estatuto_url),
    ('ata_posse_url', 'Ata e Posse', p.ata_posse_url),
    ('doc_pessoal_url', 'Documento Pessoal', p.doc_pessoal_url),
    ('doc_representante_url', 'Documento Representante', p.doc_representante_url),
    ('procuracao_url', 'Procuração', p.procuracao_url),
    ('certidao_federal_url', 'Certidão Federal', p.certidao_federal_url),
    ('certidao_estadual_url', 'Certidão Estadual', p.certidao_estadual_url),
    ('certidao_municipal_url', 'Certidão Municipal', p.certidao_municipal_url),
    ('fgts_url', 'FGTS', p.fgts_url),
    ('cndt_url', 'CNDT', p.cndt_url),
    ('atestado_tecnico_url', 'Atestado Técnico', p.atestado_tecnico_url),
    ('qualificacao_tecnica_url', 'Qualificação Técnica', p.qualificacao_tecnica_url),
    ('equipe_tecnica_url', 'Equipe Técnica', p.equipe_tecnica_url),
    ('portfolio_url', 'Portfólio', p.portfolio_url),
    ('formacao_url', 'Formação', p.formacao_url),
    ('registro_profissional_url', 'Registro Profissional', p.registro_profissional_url),
    ('comprovante_residencia_url', 'Comprovante de Residência', p.comprovante_residencia_url),
    ('cpf_url', 'CPF', p.cpf_url)
) AS v(chave, label, path)
WHERE v.path IS NOT NULL AND trim(v.path) <> ''
ON CONFLICT (proposta_id, chave, storage_path) DO NOTHING;

-- PASSO 5 — Conferência rápida no SQL Editor
-- SELECT count(*) FROM public.proposta_anexos;
-- SELECT count(*) FROM public.proposta_anexos WHERE origem = 'legado';
