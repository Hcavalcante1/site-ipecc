-- Gestão Documental — Assinatura Eletrônica IPECC (motor próprio)
-- Aplicar após gestao-documental-fase-1.sql (+ documenso.sql se já aplicado).
-- Additive. Sem DROP de tabelas de dados.

-- ---------------------------------------------------------------------------
-- Provedores: inclui 'ipecc' como padrão; mantém documento/govbr/icp futuros
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER TABLE public.gd_signature_providers
    DROP CONSTRAINT IF EXISTS gd_signature_providers_code_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.gd_signature_providers
  ADD CONSTRAINT gd_signature_providers_code_check
  CHECK (code IN (
    'ipecc',
    'documento',
    'documenso',
    'govbr',
    'icp_brasil'
  ));

INSERT INTO public.gd_signature_providers (code, name, ativo)
VALUES ('ipecc', 'Assinatura Eletrônica IPECC', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  ativo = true,
  updated_at = now();

UPDATE public.gd_signature_providers
SET ativo = false, updated_at = now()
WHERE code IN ('documento', 'documenso', 'govbr', 'icp_brasil')
  AND code <> 'ipecc';

ALTER TABLE public.gd_signature_documents
  ALTER COLUMN provider_code SET DEFAULT 'ipecc';

ALTER TABLE public.gd_signature_batches
  ALTER COLUMN provider_code SET DEFAULT 'ipecc';

-- ---------------------------------------------------------------------------
-- Colunas extras no envelope e signatários
-- ---------------------------------------------------------------------------

ALTER TABLE public.gd_signature_documents
  ADD COLUMN IF NOT EXISTS signing_mode text NOT NULL DEFAULT 'sequential'
    CHECK (signing_mode IN ('sequential', 'parallel')),
  ADD COLUMN IF NOT EXISTS validation_code text,
  ADD COLUMN IF NOT EXISTS stamped_version_id uuid
    REFERENCES public.gd_document_versions (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS gd_signature_documents_validation_code_uidx
  ON public.gd_signature_documents (validation_code)
  WHERE validation_code IS NOT NULL;

ALTER TABLE public.gd_signature_signers
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS role_code text,
  ADD COLUMN IF NOT EXISTS invite_token_hash text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz;

-- ---------------------------------------------------------------------------
-- Desafios OTP (código só em hash)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_signature_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_document_id uuid REFERENCES public.gd_signature_documents (id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.gd_signature_batches (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gd_signature_otp_target_chk CHECK (
    signature_document_id IS NOT NULL OR batch_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS gd_signature_otp_sig_idx
  ON public.gd_signature_otp_challenges (signature_document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gd_signature_otp_batch_idx
  ON public.gd_signature_otp_challenges (batch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gd_signature_otp_user_idx
  ON public.gd_signature_otp_challenges (user_id, created_at DESC);

ALTER TABLE public.gd_signature_otp_challenges ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_signature_otp_challenges IS
  'Desafios OTP da Assinatura Eletrônica IPECC. Código jamais em claro.';

-- ---------------------------------------------------------------------------
-- Evidências append-only (sem soft delete)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_signature_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_document_id uuid NOT NULL
    REFERENCES public.gd_signature_documents (id) ON DELETE RESTRICT,
  signer_id uuid REFERENCES public.gd_signature_signers (id) ON DELETE SET NULL,
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE RESTRICT,
  version_id uuid REFERENCES public.gd_document_versions (id) ON DELETE SET NULL,
  nome text NOT NULL,
  cpf text,
  email text NOT NULL,
  user_id text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  ip text,
  user_agent text,
  os text,
  browser text,
  screen_resolution text,
  document_hash_sha256 text NOT NULL,
  signed_hash_sha256 text NOT NULL,
  signed_storage_path text NOT NULL,
  consent_text text NOT NULL,
  consent_accepted_at timestamptz NOT NULL,
  auth_methods jsonb NOT NULL DEFAULT '["password","email_otp"]'::jsonb,
  otp_challenge_id uuid REFERENCES public.gd_signature_otp_challenges (id) ON DELETE SET NULL,
  validation_code text NOT NULL,
  signature_serial int NOT NULL DEFAULT 1,
  cargo text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gd_signature_evidences_validation_code_uidx
  ON public.gd_signature_evidences (validation_code);

CREATE INDEX IF NOT EXISTS gd_signature_evidences_sig_idx
  ON public.gd_signature_evidences (signature_document_id, signed_at);

CREATE INDEX IF NOT EXISTS gd_signature_evidences_doc_idx
  ON public.gd_signature_evidences (document_id, signed_at DESC);

CREATE INDEX IF NOT EXISTS gd_signature_evidences_user_idx
  ON public.gd_signature_evidences (user_id, signed_at DESC);

ALTER TABLE public.gd_signature_evidences ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_signature_evidences IS
  'Evidências imutáveis de assinatura eletrônica IPECC (append-only).';

-- ---------------------------------------------------------------------------
-- Consultas públicas de validação (auditoria de acesso)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_validation_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_code text NOT NULL,
  ip text,
  user_agent text,
  found boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gd_validation_lookups_code_idx
  ON public.gd_validation_lookups (validation_code, created_at DESC);

ALTER TABLE public.gd_validation_lookups ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_validation_lookups IS
  'Log append-only de consultas a /validar/{codigo}.';

COMMENT ON TABLE public.gd_signature_providers IS
  'Provedores: ipecc (padrão motor próprio), documento (legado self-host), govbr/icp_brasil (futuro).';
