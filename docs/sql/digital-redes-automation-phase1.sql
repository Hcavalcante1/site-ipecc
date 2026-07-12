-- Digital — automação técnica de publicação (fase 1)
-- Additive only. IF NOT EXISTS. Sem DROP.
-- Pré-requisito: digital-redes-fase1.sql (+ instagram-publish opcional/legado).
-- Escopo: admin cria/aprova/agenda; worker só executa publicação.

-- ---------------------------------------------------------------------------
-- Contas
-- ---------------------------------------------------------------------------
ALTER TABLE public.digital_accounts
  ADD COLUMN IF NOT EXISTS automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS automation_strategy text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS session_reference text,
  ADD COLUMN IF NOT EXISTS browser_profile_reference text,
  ADD COLUMN IF NOT EXISTS last_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_connection_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_connection_error text,
  ADD COLUMN IF NOT EXISTS requires_reconnect boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS publisher_config jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'digital_accounts_automation_strategy_chk'
  ) THEN
    ALTER TABLE public.digital_accounts
      ADD CONSTRAINT digital_accounts_automation_strategy_chk
      CHECK (automation_strategy IN ('manual', 'browser', 'api_legacy'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'digital_accounts_connection_status_chk'
  ) THEN
    ALTER TABLE public.digital_accounts
      ADD CONSTRAINT digital_accounts_connection_status_chk
      CHECK (connection_status IN (
        'disconnected', 'connecting', 'connected',
        'expired', 'blocked', 'challenge_required', 'error'
      ));
  END IF;
END $$;

COMMENT ON COLUMN public.digital_accounts.automation_strategy IS
  'manual | browser (Playwright) | api_legacy (Instagram Graph legado)';
COMMENT ON COLUMN public.digital_accounts.publisher_config IS
  'Config JSON do publicador. Nunca armazenar senha.';

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
ALTER TABLE public.digital_posts
  ADD COLUMN IF NOT EXISTS automation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS publish_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by text,
  ADD COLUMN IF NOT EXISTS lock_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_publish_error text,
  ADD COLUMN IF NOT EXISTS dry_run boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS media_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'digital_posts_automation_status_chk'
  ) THEN
    ALTER TABLE public.digital_posts
      ADD CONSTRAINT digital_posts_automation_status_chk
      CHECK (automation_status IN (
        'pending', 'queued', 'processing',
        'partially_published', 'published', 'failed', 'cancelled'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS digital_posts_queue_idx
  ON public.digital_posts (status, automation_status, scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS digital_posts_lock_idx
  ON public.digital_posts (locked_at, lock_expires_at)
  WHERE locked_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Targets (PK composta post_id + account_id — adicionar colunas)
-- ---------------------------------------------------------------------------
ALTER TABLE public.digital_post_targets
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS publish_strategy text,
  ADD COLUMN IF NOT EXISTS publish_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_post_url text,
  ADD COLUMN IF NOT EXISTS external_post_id text,
  ADD COLUMN IF NOT EXISTS publish_error text,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS evidence_path text,
  ADD COLUMN IF NOT EXISTS publisher_response jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'digital_post_targets_publish_status_chk'
  ) THEN
    ALTER TABLE public.digital_post_targets
      ADD CONSTRAINT digital_post_targets_publish_status_chk
      CHECK (publish_status IN (
        'pending', 'queued', 'processing', 'published', 'failed',
        'reconnect_required', 'challenge_required', 'skipped', 'cancelled'
      ));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS digital_post_targets_id_uidx
  ON public.digital_post_targets (id);

CREATE INDEX IF NOT EXISTS digital_post_targets_status_idx
  ON public.digital_post_targets (publish_status, next_attempt_at);

-- ---------------------------------------------------------------------------
-- Logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.digital_publish_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.digital_posts (id) ON DELETE SET NULL,
  target_id uuid,
  account_id uuid REFERENCES public.digital_accounts (id) ON DELETE SET NULL,
  platform text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digital_publish_logs_post_idx
  ON public.digital_publish_logs (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS digital_publish_logs_created_idx
  ON public.digital_publish_logs (created_at DESC);

ALTER TABLE public.digital_publish_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Mídia (escolhida pelo admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.digital_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  mime_type text,
  file_size bigint,
  width integer,
  height integer,
  duration_seconds numeric,
  checksum text,
  alt_text text,
  deleted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digital_media_created_idx
  ON public.digital_media (created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.digital_media ENABLE ROW LEVEL SECURITY;

-- FK media_id (após tabela existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'digital_posts_media_id_fkey'
  ) THEN
    ALTER TABLE public.digital_posts
      ADD CONSTRAINT digital_posts_media_id_fkey
      FOREIGN KEY (media_id) REFERENCES public.digital_media (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Expandir published_via legado (opcional)
ALTER TABLE public.digital_posts DROP CONSTRAINT IF EXISTS digital_posts_published_via_check;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'digital_posts_published_via_chk'
  ) THEN
    ALTER TABLE public.digital_posts
      ADD CONSTRAINT digital_posts_published_via_chk
      CHECK (
        published_via IS NULL
        OR published_via IN ('manual', 'instagram_api', 'browser', 'api_legacy')
      );
  END IF;
EXCEPTION WHEN undefined_column THEN
  NULL;
END $$;

COMMENT ON TABLE public.digital_publish_logs IS
  'Auditoria de execução do worker de publicação (não editorial).';
COMMENT ON TABLE public.digital_media IS
  'Biblioteca de mídia escolhida pelo administrador Digital.';
