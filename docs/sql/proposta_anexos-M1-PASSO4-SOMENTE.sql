-- M1 — Somente migração legado (use se a tabela proposta_anexos já existir vazia)
-- Arquivo completo: proposta_anexos-M1-staging-APLICAR.sql

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
