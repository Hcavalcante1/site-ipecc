/*
  DIAGNOSTICO: editais_secoes vs paginas_conteudo
  Somente leitura. Rode no SQL Editor (staging primeiro).

  Se existe_editais_secoes = false:
    A tabela legado nunca existiu (ou foi removida) neste projeto Supabase.
    O site publico usa apenas paginas_conteudo + editais + editais_documentos.
    NAO rode os blocos marcados LEGADO abaixo.
*/

SELECT
  current_database() AS database_name,
  current_user AS db_user,
  now() AS server_time_utc;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'editais_secoes'
) AS existe_editais_secoes;

/*
  CMS PUBLICO (sempre valido)
  Fonte real da pagina /editais no codigo Next.js
*/
SELECT
  count(*) AS total_blocos_editais,
  count(*) FILTER (WHERE bloco = 'hero') AS blocos_hero,
  count(*) FILTER (WHERE bloco = 'documentos') AS blocos_documentos,
  count(*) FILTER (WHERE bloco = 'cta') AS blocos_cta,
  count(*) FILTER (WHERE bloco = 'textos') AS blocos_textos,
  count(*) FILTER (WHERE bloco = 'mural') AS blocos_mural
FROM public.paginas_conteudo
WHERE pagina_slug = 'editais';

SELECT
  id,
  pagina_slug,
  bloco,
  left(coalesce(titulo, ''), 80) AS titulo,
  left(coalesce(texto, ''), 120) AS texto_preview,
  (extra IS NOT NULL) AS tem_extra,
  updated_at
FROM public.paginas_conteudo
WHERE pagina_slug = 'editais'
ORDER BY bloco, updated_at DESC;

SELECT
  pagina_slug,
  bloco,
  count(*) AS qtd,
  array_agg(id::text ORDER BY updated_at DESC) AS ids
FROM public.paginas_conteudo
WHERE pagina_slug = 'editais'
GROUP BY pagina_slug, bloco
HAVING count(*) > 1;

SELECT
  'paginas_conteudo_hero' AS origem,
  id::text AS registro_id,
  coalesce(titulo, '') AS titulo,
  left(coalesce(texto, ''), 200) AS texto_preview,
  updated_at
FROM public.paginas_conteudo
WHERE pagina_slug = 'editais'
  AND bloco = 'hero'
ORDER BY updated_at DESC
LIMIT 3;

SELECT
  count(*) AS total_documentos,
  count(*) FILTER (WHERE ativo IS TRUE) AS ativos,
  count(*) FILTER (WHERE pagina_slug = 'editais') AS slug_editais
FROM public.editais_documentos;

/*
  LEGADO editais_secoes
  Descomente SOMENTE se existe_editais_secoes = true.
  Se false, ignore este bloco inteiro.

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'editais_secoes'
ORDER BY ordinal_position;

SELECT count(*) AS total_linhas FROM public.editais_secoes;
SELECT * FROM public.editais_secoes ORDER BY 1;

SELECT 'editais_secoes_legado' AS origem, row_to_json(t) AS registro
FROM public.editais_secoes AS t ORDER BY 1 LIMIT 5;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'editais_secoes'
ORDER BY policyname;

*/
