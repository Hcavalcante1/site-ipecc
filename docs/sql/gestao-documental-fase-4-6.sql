-- Gestão Documental — Fases 4–6
-- Estado OAuth gov.br, notificações internas e índices de lote/signatário.
-- Aplicar após gestao-documental-fase-1.sql e gestao-documental-fase-3.sql

-- ---------------------------------------------------------------------------
-- Fase 4 — estados OAuth (curto prazo; token limpo após uso)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_oauth_states (
  state text PRIMARY KEY,
  user_id text NOT NULL,
  signature_document_id uuid REFERENCES public.gd_signature_documents (id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.gd_signature_batches (id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'sign',
  access_token text,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS gd_oauth_states_user_idx
  ON public.gd_oauth_states (user_id);

CREATE INDEX IF NOT EXISTS gd_oauth_states_expires_idx
  ON public.gd_oauth_states (expires_at);

ALTER TABLE public.gd_oauth_states ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_oauth_states IS
  'Estados OAuth2 gov.br (Fase 4). Access token temporário; APIs usam service role.';

-- ---------------------------------------------------------------------------
-- Fase 5 — índices de lotes e signatários
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS gd_signature_batches_processo_idx
  ON public.gd_signature_batches (processo_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_signature_batches_status_idx
  ON public.gd_signature_batches (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_signature_batch_items_batch_idx
  ON public.gd_signature_batch_items (batch_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_signature_signers_doc_idx
  ON public.gd_signature_signers (document_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_signature_signers_batch_idx
  ON public.gd_signature_signers (batch_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_signature_documents_doc_idx
  ON public.gd_signature_documents (document_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Fase 6 — notificações in-app / e-mail (fila)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos_contratacao (id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.gd_documents (id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.gd_signature_batches (id) ON DELETE SET NULL,
  user_id text,
  email text,
  channel text NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app', 'email')),
  event_type text NOT NULL,
  title text NOT NULL,
  body text,
  link_path text,
  read_at timestamptz,
  sent_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS gd_notifications_user_idx
  ON public.gd_notifications (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_notifications_processo_idx
  ON public.gd_notifications (processo_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_notifications_unread_idx
  ON public.gd_notifications (user_id)
  WHERE deleted_at IS NULL AND read_at IS NULL AND channel = 'in_app';

ALTER TABLE public.gd_notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_notifications IS
  'Notificações da Gestão Documental (Fase 6) — in-app e fila de e-mail.';
