-- =============================================================================
-- RASCUNHO — proposta_anexos (NÃO executar em produção sem revisão e autorização)
-- Alinhado a lib/documental/propostaPaths.ts (ANEXOS_URL_PROPOSTA)
-- Ambiente sugerido para primeira aplicação: staging/dev
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tabela
-- -----------------------------------------------------------------------------
/*
CREATE TABLE IF NOT EXISTS public.proposta_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  chave text NOT NULL,              -- ex: arquivo_url, cnpj_url (mesma key do legado)
  label text,                       -- rótulo exibido no admin
  storage_path text NOT NULL,       -- path no bucket propostas (sem URL pública)
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
*/

-- -----------------------------------------------------------------------------
-- 2) Trigger updated_at (opcional)
-- -----------------------------------------------------------------------------
/*
CREATE OR REPLACE FUNCTION public.set_updated_at_proposta_anexos()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proposta_anexos_updated_at
  BEFORE UPDATE ON public.proposta_anexos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_proposta_anexos();
*/

-- -----------------------------------------------------------------------------
-- 3) RLS (referência — ajustar conforme is_admin() existente)
-- -----------------------------------------------------------------------------
/*
ALTER TABLE public.proposta_anexos ENABLE ROW LEVEL SECURITY;

-- Leitura/escrita apenas admin (mesmo padrão de propostas sensíveis)
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

-- INSERT público: somente se produto exigir gravar anexos na tabela no envio
-- (fase 2 do plano de migração; inicialmente pode ficar só via migração + admin)
*/

-- -----------------------------------------------------------------------------
-- 4) Migração legado (esboço — rodar UMA VEZ após criar tabela, em staging)
-- -----------------------------------------------------------------------------
/*
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
*/

-- Após migração: npm run audit:anexos (deve permanecer 0 órfãos)
