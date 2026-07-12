-- Digital — publicação Instagram (Graph API)
-- Aplicar no SQL Editor do Supabase após digital-redes-fase1.sql.
-- Requer env no servidor: META_GRAPH_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID
-- (opcional META_GRAPH_API_VERSION, padrão v21.0).
-- A API do Instagram exige image_url pública; posts só texto não são publicados via API.

ALTER TABLE digital_posts
  ADD COLUMN IF NOT EXISTS external_post_id text,
  ADD COLUMN IF NOT EXISTS publish_error text,
  ADD COLUMN IF NOT EXISTS published_via text
    CHECK (
      published_via IS NULL
      OR published_via IN ('manual', 'instagram_api')
    );

COMMENT ON COLUMN digital_posts.external_post_id IS
  'ID do post na rede (ex.: Instagram media id) após publish via API.';
COMMENT ON COLUMN digital_posts.publish_error IS
  'Último erro de publicação automática (PT/operacional).';
COMMENT ON COLUMN digital_posts.published_via IS
  'Como foi marcado publicado: manual (copiar/colar) ou instagram_api.';
