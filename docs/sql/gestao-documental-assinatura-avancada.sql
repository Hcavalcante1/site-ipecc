-- Gestão Documental — Assinatura Eletrônica AVANÇADA IPECC
-- Aplicar APÓS gestao-documental-assinatura-ipecc.sql
-- Additive. Sem DROP. Sem reescrever o módulo simples.
-- Isolamento: service role nas APIs admin; RLS habilitado (sem policy = sem acesso anon/authenticated).

-- ---------------------------------------------------------------------------
-- Classificação retroativa no motor SIMPLES (não altera dados existentes)
-- ---------------------------------------------------------------------------

ALTER TABLE public.gd_signature_documents
  ADD COLUMN IF NOT EXISTS signature_level text NOT NULL DEFAULT 'LEGACY_SIMPLE';

DO $$
BEGIN
  ALTER TABLE public.gd_signature_documents
    DROP CONSTRAINT IF EXISTS gd_signature_documents_signature_level_chk;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.gd_signature_documents
  ADD CONSTRAINT gd_signature_documents_signature_level_chk
  CHECK (signature_level IN ('SIMPLE', 'ADVANCED', 'LEGACY_SIMPLE'));

COMMENT ON COLUMN public.gd_signature_documents.signature_level IS
  'SIMPLE = motor ipecc atual; LEGACY_SIMPLE = registros anteriores à coluna; ADVANCED não deve ser usado neste envelope.';

ALTER TABLE public.gd_signature_evidences
  ADD COLUMN IF NOT EXISTS signature_level text NOT NULL DEFAULT 'LEGACY_SIMPLE';

DO $$
BEGIN
  ALTER TABLE public.gd_signature_evidences
    DROP CONSTRAINT IF EXISTS gd_signature_evidences_signature_level_chk;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.gd_signature_evidences
  ADD CONSTRAINT gd_signature_evidences_signature_level_chk
  CHECK (signature_level IN ('SIMPLE', 'LEGACY_SIMPLE'));

-- Após aplicar este SQL, a aplicação pode gravar signature_level='SIMPLE'
-- em novos pedidos/evidências do motor ipecc. Até lá, o DEFAULT LEGACY_SIMPLE vale.

-- ---------------------------------------------------------------------------
-- Políticas / chaves do sistema (selo de evidências avançadas)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_adv_key_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_label text NOT NULL UNIQUE,
  algorithm text NOT NULL DEFAULT 'Ed25519'
    CHECK (algorithm IN ('Ed25519', 'ECDSA_P256')),
  public_key_pem text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS gd_adv_key_versions_one_active_uidx
  ON public.gd_adv_key_versions ((active))
  WHERE active = true;

ALTER TABLE public.gd_adv_key_versions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_adv_key_versions IS
  'Versões de chave pública do sistema para selar manifestos. Chave privada NUNCA nesta tabela.';

CREATE TABLE IF NOT EXISTS public.gd_adv_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  locale text NOT NULL DEFAULT 'pt-BR',
  version_label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gd_adv_policies ENABLE ROW LEVEL SECURITY;

INSERT INTO public.gd_adv_policies (code, title, body, version_label, active)
VALUES (
  'consent_advanced_v1',
  'Consentimento — Assinatura eletrônica avançada',
  'Declaro que li o documento, concordo com seu conteúdo e confirmo que esta assinatura eletrônica representa minha manifestação pessoal, livre, consciente e inequívoca de vontade. Estou ciente de que esta modalidade não equivale a assinatura qualificada ICP-Brasil.',
  '1.0',
  true
)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Identidade do signatário (habilitação avançada)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_adv_identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  processo_id uuid,
  full_name text NOT NULL,
  cpf_hash text NOT NULL,
  cpf_last4 text,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  phone text,
  phone_verified boolean NOT NULL DEFAULT false,
  cargo text,
  organization_label text,
  identity_level text NOT NULL DEFAULT 'BASIC'
    CHECK (identity_level IN ('BASIC', 'VERIFIED', 'HIGH')),
  status text NOT NULL DEFAULT 'NOT_VERIFIED'
    CHECK (status IN (
      'NOT_VERIFIED', 'PENDING', 'VERIFIED', 'SUSPENDED', 'REVOKED', 'EXPIRED'
    )),
  verification_method text,
  verified_by text,
  verified_at timestamptz,
  valid_until timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  trust_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gd_adv_identity_user_proc_uidx
  ON public.gd_adv_identity_verifications (
    user_id,
    (COALESCE(processo_id::text, 'geral'))
  );

CREATE UNIQUE INDEX IF NOT EXISTS gd_adv_identity_cpf_active_uidx
  ON public.gd_adv_identity_verifications (cpf_hash)
  WHERE status IN ('PENDING', 'VERIFIED');

CREATE INDEX IF NOT EXISTS gd_adv_identity_status_idx
  ON public.gd_adv_identity_verifications (status, updated_at DESC);

ALTER TABLE public.gd_adv_identity_verifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_adv_identity_verifications IS
  'Habilitação de identidade para assinatura avançada. CPF apenas em hash + últimos 4.';

-- ---------------------------------------------------------------------------
-- Lotes avançados
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_adv_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid,
  created_by text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT', 'PENDING', 'AWAITING_AUTHENTICATION', 'AUTHORIZED',
      'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED'
    )),
  item_count int NOT NULL DEFAULT 0,
  batch_hash_sha256 text,
  consent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.gd_adv_batches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.gd_adv_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.gd_adv_batches (id) ON DELETE RESTRICT,
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE RESTRICT,
  document_version_id uuid REFERENCES public.gd_document_versions (id) ON DELETE SET NULL,
  document_hash_sha256 text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  transaction_id uuid,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED'
    )),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, document_id)
);

CREATE INDEX IF NOT EXISTS gd_adv_batch_items_batch_idx
  ON public.gd_adv_batch_items (batch_id, sort_order);

ALTER TABLE public.gd_adv_batch_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Transações avançadas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_adv_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid,
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE RESTRICT,
  document_version_id uuid NOT NULL REFERENCES public.gd_document_versions (id) ON DELETE RESTRICT,
  signature_level text NOT NULL DEFAULT 'ADVANCED'
    CHECK (signature_level = 'ADVANCED'),
  signer_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT', 'PENDING', 'AWAITING_SIGNER', 'AWAITING_AUTHENTICATION',
      'AUTHORIZED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED',
      'EXPIRED', 'REVOKED', 'FAILED'
    )),
  document_hash_sha256 text NOT NULL,
  final_document_hash_sha256 text,
  document_size_bytes bigint,
  document_mime_type text NOT NULL DEFAULT 'application/pdf',
  identity_verification_id uuid
    REFERENCES public.gd_adv_identity_verifications (id) ON DELETE RESTRICT,
  identity_level text,
  consent_id uuid,
  authentication_method text,
  mfa_method text,
  verification_code text,
  system_key_version_id uuid
    REFERENCES public.gd_adv_key_versions (id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.gd_adv_batches (id) ON DELETE SET NULL,
  original_storage_path text NOT NULL,
  locked_at timestamptz,
  authorized_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  revoked_at timestamptz,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS gd_adv_transactions_verification_code_uidx
  ON public.gd_adv_transactions (verification_code)
  WHERE verification_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS gd_adv_transactions_idempotency_uidx
  ON public.gd_adv_transactions (signer_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS gd_adv_transactions_doc_idx
  ON public.gd_adv_transactions (document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gd_adv_transactions_signer_idx
  ON public.gd_adv_transactions (signer_user_id, status);

CREATE INDEX IF NOT EXISTS gd_adv_transactions_status_idx
  ON public.gd_adv_transactions (status, updated_at DESC);

ALTER TABLE public.gd_adv_transactions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_adv_transactions IS
  'Transações de Assinatura Eletrônica Avançada IPECC (independente do motor simples).';

ALTER TABLE public.gd_adv_batch_items
  DROP CONSTRAINT IF EXISTS gd_adv_batch_items_transaction_id_fkey;

ALTER TABLE public.gd_adv_batch_items
  ADD CONSTRAINT gd_adv_batch_items_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES public.gd_adv_transactions (id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Consentimentos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_adv_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.gd_adv_transactions (id) ON DELETE RESTRICT,
  policy_code text NOT NULL,
  policy_version text NOT NULL,
  locale text NOT NULL DEFAULT 'pt-BR',
  consent_text text NOT NULL,
  document_id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  document_hash_sha256 text NOT NULL,
  signer_user_id text NOT NULL,
  processo_id uuid,
  accepted boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  session_id text,
  ip text,
  user_agent text,
  authentication_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gd_adv_consents_tx_idx
  ON public.gd_adv_consents (transaction_id, created_at DESC);

ALTER TABLE public.gd_adv_consents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gd_adv_transactions
  DROP CONSTRAINT IF EXISTS gd_adv_transactions_consent_id_fkey;

ALTER TABLE public.gd_adv_transactions
  ADD CONSTRAINT gd_adv_transactions_consent_id_fkey
  FOREIGN KEY (consent_id) REFERENCES public.gd_adv_consents (id)
  ON DELETE SET NULL;

ALTER TABLE public.gd_adv_batches
  DROP CONSTRAINT IF EXISTS gd_adv_batches_consent_id_fkey;

ALTER TABLE public.gd_adv_batches
  ADD CONSTRAINT gd_adv_batches_consent_id_fkey
  FOREIGN KEY (consent_id) REFERENCES public.gd_adv_consents (id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Desafios de autenticação (reauth / MFA / nonce uso único)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_adv_auth_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.gd_adv_transactions (id) ON DELETE RESTRICT,
  signer_user_id text NOT NULL,
  challenge_type text NOT NULL
    CHECK (challenge_type IN (
      'PASSWORD_REAUTH', 'EMAIL_OTP', 'TOTP', 'PASSKEY', 'COMPOSITE'
    )),
  nonce_hash text NOT NULL,
  code_hash text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONSUMED', 'EXPIRED', 'FAILED')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  document_hash_sha256 text NOT NULL,
  consent_id uuid REFERENCES public.gd_adv_consents (id) ON DELETE SET NULL,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gd_adv_auth_challenges_tx_idx
  ON public.gd_adv_auth_challenges (transaction_id, created_at DESC);

ALTER TABLE public.gd_adv_auth_challenges ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_adv_auth_challenges IS
  'Desafios de uso único para controle exclusivo do signatário (avançado).';

-- ---------------------------------------------------------------------------
-- Eventos append-only (hash encadeado)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_adv_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.gd_adv_transactions (id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  actor_user_id text,
  server_timestamp timestamptz NOT NULL DEFAULT now(),
  request_id text,
  session_id text,
  ip text,
  user_agent text,
  previous_hash text,
  event_hash text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gd_adv_events_tx_idx
  ON public.gd_adv_events (transaction_id, created_at ASC);

ALTER TABLE public.gd_adv_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.gd_adv_forbid_mutate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Tabela % é append-only (imutável).', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS gd_adv_events_no_update ON public.gd_adv_events;
CREATE TRIGGER gd_adv_events_no_update
  BEFORE UPDATE OR DELETE ON public.gd_adv_events
  FOR EACH ROW EXECUTE FUNCTION public.gd_adv_forbid_mutate();

-- ---------------------------------------------------------------------------
-- Artefatos (paths no storage)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_adv_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.gd_adv_transactions (id) ON DELETE RESTRICT,
  artifact_type text NOT NULL
    CHECK (artifact_type IN (
      'ORIGINAL_DOCUMENT',
      'SIGNED_ADVANCED_DOCUMENT',
      'EVIDENCE_CERTIFICATE',
      'EVIDENCE_JSON',
      'SIGNED_MANIFEST'
    )),
  storage_bucket text NOT NULL DEFAULT 'gestao-documental',
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, artifact_type)
);

CREATE INDEX IF NOT EXISTS gd_adv_artifacts_tx_idx
  ON public.gd_adv_artifacts (transaction_id);

ALTER TABLE public.gd_adv_artifacts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS gd_adv_artifacts_no_update ON public.gd_adv_artifacts;
CREATE TRIGGER gd_adv_artifacts_no_update
  BEFORE UPDATE OR DELETE ON public.gd_adv_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.gd_adv_forbid_mutate();

COMMENT ON TABLE public.gd_adv_artifacts IS
  'Artefatos imutáveis da assinatura avançada. Nunca sobrescrever paths.';
