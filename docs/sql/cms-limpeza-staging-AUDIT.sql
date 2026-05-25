-- CMS staging — AUDITORIA (SELECT only).
-- Rodar no SQL Editor do Supabase STAGING.
-- Não altera dados.

-- Editais
SELECT id, titulo, status, created_at
FROM editais
WHERE titulo ~* '^(test|teste|test[0-9]*|demo)'
   OR titulo ILIKE '%TESTE%'
ORDER BY created_at DESC;

-- Transparência — convênios publicados
SELECT id, titulo, numero_instrumento, publicado, created_at
FROM transparencia_convenios
WHERE publicado = true
  AND (
    titulo ~* '^(test|teste|test[0-9]*)'
    OR titulo ILIKE '%TEST%'
    OR length(trim(titulo)) <= 4
  )
ORDER BY created_at DESC;

-- Transparência — editais/chamamentos publicados
SELECT id, titulo, status_fase, publicado, created_at
FROM transparencia_editais
WHERE publicado = true
  AND titulo ~* '^(test|teste|test[0-9]*)'
ORDER BY created_at DESC;

-- Transparência — prestação de contas publicada
SELECT id, titulo, fase, publicado, created_at
FROM transparencia_prestacao_contas
WHERE publicado = true
  AND titulo ~* '^(test|teste|test[0-9]*)'
ORDER BY created_at DESC;

-- Copy institucional a revisar (não é “teste”, mas checklist visual)
SELECT pagina_slug, bloco, left(coalesce(titulo,''), 80) AS titulo,
       left(coalesce(texto,''), 120) AS texto_preview
FROM paginas_conteudo
WHERE pagina_slug IN ('transparencia', 'projetos', 'home')
  AND (
    texto ~* 'APECC'
    OR texto ~ ',\\s*,'
    OR texto ~* 'unem\\s*,\\s*cultura'
  );
