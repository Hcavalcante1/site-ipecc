-- Digital (redes sociais) — Fase 1
-- Contas (site + por projeto) e fila editorial de posts.
-- Aplicar manualmente no Supabase. Sem publicação automática nas APIs nesta fase.
-- Leitura pública: apenas contas site ativas (URLs oficiais). Escrita só via API admin (service role).

CREATE TABLE IF NOT EXISTS digital_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL
    CHECK (platform IN ('instagram', 'facebook', 'youtube', 'linkedin', 'tiktok')),
  label text NOT NULL,
  href text NOT NULL,
  handle text,
  scope text NOT NULL DEFAULT 'site'
    CHECK (scope IN ('site', 'projeto')),
  projeto_ref text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS digital_accounts_site_platform_uidx
  ON digital_accounts (platform)
  WHERE scope = 'site' AND ativo = true;

CREATE INDEX IF NOT EXISTS digital_accounts_scope_idx
  ON digital_accounts (scope, ativo);

CREATE TABLE IF NOT EXISTS digital_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  hashtags text,
  media_url text,
  source_type text NOT NULL DEFAULT 'manual'
    CHECK (source_type IN (
      'manual',
      'agent_noticia',
      'agent_evento',
      'agent_projeto'
    )),
  source_id text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'approved',
      'scheduled',
      'published_manual',
      'archived'
    )),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digital_posts_status_idx
  ON digital_posts (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS digital_posts_source_uidx
  ON digital_posts (source_type, source_id)
  WHERE source_id IS NOT NULL AND status <> 'archived';

CREATE TABLE IF NOT EXISTS digital_post_targets (
  post_id uuid NOT NULL REFERENCES digital_posts (id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES digital_accounts (id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, account_id)
);

COMMENT ON TABLE digital_accounts IS
  'Perfis de redes sociais do site e por projeto (Fase 1 Digital).';
COMMENT ON TABLE digital_posts IS
  'Fila editorial de posts (rascunhos/aprovados). Publicação API = Fase 2.';

-- Seed contas institucionais (idempotente por platform + scope site)
INSERT INTO digital_accounts (platform, label, href, handle, scope, ativo)
SELECT v.platform, v.label, v.href, v.handle, 'site', true
FROM (
  VALUES
    (
      'instagram',
      'Instagram',
      'https://www.instagram.com/ipecc.sp/',
      'ipecc.sp'
    ),
    (
      'facebook',
      'Facebook',
      'https://www.facebook.com/profile.php?id=61580740405079',
      NULL
    ),
    (
      'youtube',
      'YouTube',
      'https://www.youtube.com/@InstitutoPaulistaIPECC',
      '@InstitutoPaulistaIPECC'
    ),
    (
      'linkedin',
      'LinkedIn',
      'https://www.linkedin.com/in/instituto-paulista-ipecc-9037b73b6/',
      'instituto-paulista-ipecc'
    ),
    (
      'tiktok',
      'TikTok',
      'https://www.tiktok.com/@ipecc.sp',
      'ipecc.sp'
    )
) AS v(platform, label, href, handle)
WHERE NOT EXISTS (
  SELECT 1
  FROM digital_accounts a
  WHERE a.scope = 'site' AND a.platform = v.platform AND a.ativo = true
);

-- RLS: anon só lê contas site ativas (links públicos). Posts sem acesso anon.
ALTER TABLE digital_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_post_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS digital_accounts_public_read_site ON digital_accounts;
CREATE POLICY digital_accounts_public_read_site
  ON digital_accounts
  FOR SELECT
  TO anon, authenticated
  USING (scope = 'site' AND ativo = true);

-- service role bypassa RLS nas APIs admin
