-- Referência operacional: correção de anexos órfãos (tabela propostas × bucket propostas)
-- Executar manualmente no SQL Editor do Supabase após revisar cada linha.
-- Não commitar credenciais. Preferir backup ou SELECT antes de UPDATE.

-- =============================================================================
-- 1) Diagnóstico: linhas com URLs preenchidas (ajuste filtros se necessário)
-- =============================================================================

SELECT
  id,
  nome,
  email,
  arquivo_url,
  cnpj_url,
  estatuto_url,
  contrato_social_url,
  criado_em
FROM propostas
WHERE
  coalesce(arquivo_url, '') <> ''
  OR coalesce(cnpj_url, '') <> ''
  OR coalesce(estatuto_url, '') <> ''
ORDER BY criado_em DESC;

-- =============================================================================
-- 2) Proposta de teste sem arquivo (1 órfão típico)
-- id: 9e265fc7-3cca-4b51-8a20-e5e13ac8be73
-- path: 1779231619365-proposta-teste-validacao.pdf
-- Opção A: limpar URL (admin deixa de mostrar link quebrado)
-- =============================================================================

-- SELECT id, arquivo_url FROM propostas WHERE id = '9e265fc7-3cca-4b51-8a20-e5e13ac8be73';

-- UPDATE propostas
-- SET arquivo_url = NULL
-- WHERE id = '9e265fc7-3cca-4b51-8a20-e5e13ac8be73';

-- Opção B: excluir proposta de teste (irreversível)
-- DELETE FROM propostas WHERE id = '9e265fc7-3cca-4b51-8a20-e5e13ac8be73';

-- =============================================================================
-- 3) Paths legados com prefixo propostas/public/ (proposta asap)
-- id: e8b0b8b8-94c8-4104-930d-e11233221b50
-- Antes de UPDATE: no Storage, confirmar se o arquivo está em public/NOME.pdf
-- O código agora tenta candidatos sem o prefixo errado; se existir em public/, pode
-- bastar normalizar a coluna para public/NOME.pdf ou NOME.pdf
-- =============================================================================

-- SELECT id, arquivo_url, cnpj_url, estatuto_url
-- FROM propostas WHERE id = 'e8b0b8b8-94c8-4104-930d-e11233221b50';

-- Exemplo: normalizar arquivo_url (ajuste o path após ver no Storage)
-- UPDATE propostas SET arquivo_url = 'public/1774299374293-proposta-3964-05.pdf'
-- WHERE id = 'e8b0b8b8-94c8-4104-930d-e11233221b50'
--   AND arquivo_url = 'propostas/public/1774299374293-proposta-3964-05.pdf';

-- UPDATE propostas SET cnpj_url = 'public/1774299377009-cnpj-3964-05.pdf'
-- WHERE id = 'e8b0b8b8-94c8-4104-930d-e11233221b50'
--   AND cnpj_url = 'propostas/public/1774299377009-cnpj-3964-05.pdf';

-- UPDATE propostas SET estatuto_url = 'public/1774299376006-estatuto-3964-05.pdf'
-- WHERE id = 'e8b0b8b8-94c8-4104-930d-e11233221b50'
--   AND estatuto_url = 'propostas/public/1774299376006-estatuto-3964-05.pdf';

-- Alternativa em lote (só se o padrão bater com todos os registros afetados):
-- UPDATE propostas
-- SET arquivo_url = regexp_replace(arquivo_url, '^propostas/public/', 'public/')
-- WHERE arquivo_url LIKE 'propostas/public/%';

-- =============================================================================
-- 4) Pós-correção
-- =============================================================================
-- Rodar no projeto: npm run audit:anexos
-- Meta: Órfãos = 0 no relatório e em /admin/propostas/auditoria
