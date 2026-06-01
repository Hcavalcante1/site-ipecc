-- Diagnostico editais: somente SELECT.
-- Se existe_editais_secoes = false, a tabela legado NAO existe no banco (normal).
-- Nesse caso, rode apenas a parte "CMS publico" abaixo.

SELECT current_database() AS database_name, now() AS agora;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'editais_secoes'
) AS existe_editais_secoes;

/* ========== CMS publico (sempre rodar) ========== */
SELECT bloco, count(*) AS qtd
FROM public.paginas_conteudo
WHERE pagina_slug = 'editais'
GROUP BY bloco
ORDER BY bloco;

SELECT id, bloco, titulo, left(coalesce(texto, ''), 100) AS texto, updated_at
FROM public.paginas_conteudo
WHERE pagina_slug = 'editais' AND bloco = 'hero';

SELECT id, bloco, titulo, left(coalesce(texto, ''), 80) AS texto, updated_at
FROM public.paginas_conteudo
WHERE pagina_slug = 'editais'
ORDER BY bloco;

SELECT count(*) AS total_editais_documentos
FROM public.editais_documentos
WHERE pagina_slug = 'editais';

/* ========== Legado: SO rodar se existe_editais_secoes = true ========== */
/* Descomente as 2 linhas abaixo somente se a tabela existir:

SELECT count(*) AS linhas_editais_secoes FROM public.editais_secoes;
SELECT * FROM public.editais_secoes ORDER BY 1;

*/
