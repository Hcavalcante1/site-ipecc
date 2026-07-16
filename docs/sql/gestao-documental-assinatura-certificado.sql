-- Gestão Documental — Assinatura com CERTIFICADO DIGITAL (PFX local)
-- Additive. Sem DROP. Chave privada NUNCA no servidor.
-- Isolamento: service role nas APIs admin; RLS habilitado (sem policy = sem acesso anon).

-- ---------------------------------------------------------------------------
-- Transações unitárias
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_cert_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid,
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE RESTRICT,
  document_version_id uuid REFERENCES public.gd_document_versions (id) ON DELETE SET NULL,
  signature_level text NOT NULL DEFAULT 'CERTIFICATE'
    CHECK (signature_level = 'CERTIFICATE'),
  signer_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED'
    )),
  document_hash_sha256 text NOT NULL,
  final_document_hash_sha256 text,
  original_storage_path text NOT NULL,
  verification_code text,
  batch_id uuid,
  -- Metadados públicos do certificado (nunca chave privada)
  cert_subject text,
  cert_issuer text,
  cert_serial text,
  cert_not_before timestamptz,
  cert_not_after timestamptz,
  cert_thumbprint_sha256 text,
  -- Aparência visual no PDF multipágina
  appearance_page int,
  appearance_x numeric,
  appearance_y numeric,
  appearance_width numeric,
  appearance_height numeric,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS gd_cert_transactions_verification_code_uidx
  ON public.gd_cert_transactions (verification_code)
  WHERE verification_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS gd_cert_transactions_doc_idx
  ON public.gd_cert_transactions (document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gd_cert_transactions_signer_idx
  ON public.gd_cert_transactions (signer_user_id, status);

ALTER TABLE public.gd_cert_transactions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_cert_transactions IS
  'Assinatura com certificado digital do signatário (PFX no cliente). Sem chave privada.';

-- ---------------------------------------------------------------------------
-- Lotes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_cert_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid,
  created_by text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED'
    )),
  item_count int NOT NULL DEFAULT 0,
  batch_hash_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.gd_cert_batches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.gd_cert_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.gd_cert_batches (id) ON DELETE RESTRICT,
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE RESTRICT,
  document_version_id uuid REFERENCES public.gd_document_versions (id) ON DELETE SET NULL,
  document_hash_sha256 text NOT NULL,
  transaction_id uuid REFERENCES public.gd_cert_transactions (id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED'
    )),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, document_id)
);

CREATE INDEX IF NOT EXISTS gd_cert_batch_items_batch_idx
  ON public.gd_cert_batch_items (batch_id, sort_order);

ALTER TABLE public.gd_cert_batch_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gd_cert_transactions
  DROP CONSTRAINT IF EXISTS gd_cert_transactions_batch_id_fkey;

ALTER TABLE public.gd_cert_transactions
  ADD CONSTRAINT gd_cert_transactions_batch_id_fkey
  FOREIGN KEY (batch_id) REFERENCES public.gd_cert_batches (id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Eventos append-only
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_cert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.gd_cert_transactions (id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  actor_user_id text,
  server_timestamp timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gd_cert_events_tx_idx
  ON public.gd_cert_events (transaction_id, created_at ASC);

ALTER TABLE public.gd_cert_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.gd_cert_forbid_mutate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Tabela % é append-only (imutável).', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS gd_cert_events_no_update ON public.gd_cert_events;
CREATE TRIGGER gd_cert_events_no_update
  BEFORE UPDATE OR DELETE ON public.gd_cert_events
  FOR EACH ROW EXECUTE FUNCTION public.gd_cert_forbid_mutate();

-- ---------------------------------------------------------------------------
-- Artefatos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_cert_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.gd_cert_transactions (id) ON DELETE RESTRICT,
  artifact_type text NOT NULL
    CHECK (artifact_type IN (
      'ORIGINAL_DOCUMENT',
      'SIGNED_CERTIFICATE_DOCUMENT',
      'PKCS7_SIGNATURE',
      'EVIDENCE_JSON'
    )),
  storage_bucket text NOT NULL DEFAULT 'gestao-documental',
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, artifact_type)
);

CREATE INDEX IF NOT EXISTS gd_cert_artifacts_tx_idx
  ON public.gd_cert_artifacts (transaction_id);

ALTER TABLE public.gd_cert_artifacts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS gd_cert_artifacts_no_update ON public.gd_cert_artifacts;
CREATE TRIGGER gd_cert_artifacts_no_update
  BEFORE UPDATE OR DELETE ON public.gd_cert_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.gd_cert_forbid_mutate();

COMMENT ON TABLE public.gd_cert_artifacts IS
  'Artefatos da assinatura com certificado. Sem chave privada.';
