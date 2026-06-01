-- Garante uma linha por (pagina_slug, bloco) e permite upsert onConflict.
-- Execute no SQL Editor do Supabase (staging/produção).

-- Opcional: remover duplicatas antigas (mantém a mais recente por bloco)
-- WITH ranked AS (
--   SELECT id,
--          ROW_NUMBER() OVER (
--            PARTITION BY pagina_slug, bloco
--            ORDER BY updated_at DESC NULLS LAST, created_at DESC
--          ) AS rn
--   FROM paginas_conteudo
-- )
-- DELETE FROM paginas_conteudo
-- WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE paginas_conteudo
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS paginas_conteudo_slug_bloco_uidx
  ON paginas_conteudo (pagina_slug, bloco);
