-- CMS staging — OCULTAR registros de teste (UPDATE publicado = false).
-- ⚠️ SOMENTE STAGING. Conferir SELECT em cms-limpeza-staging-AUDIT.sql antes.
-- Substituir :ids pelos UUIDs reais ou descomentar blocos após revisão humana.

-- Exemplo (NÃO executar cegamente):
-- UPDATE transparencia_convenios
-- SET publicado = false, updated_at = now()
-- WHERE id IN ('uuid-1', 'uuid-2');

-- UPDATE transparencia_editais
-- SET publicado = false, updated_at = now()
-- WHERE titulo ~* '^(test|teste|test[0-9]*)';

-- UPDATE transparencia_prestacao_contas
-- SET publicado = false, updated_at = now()
-- WHERE titulo ~* '^(test|teste|test[0-9]*)';

-- Editais (tabela editais — sem coluna publicado; excluir via /admin/editais ou):
-- DELETE FROM editais WHERE id IN ('uuid') AND titulo ~* '^test';

-- Após UPDATE: npm run auditar:cms-staging
