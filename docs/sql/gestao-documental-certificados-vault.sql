-- Gestao Documental - Cofre de certificados digitais
-- Additive. Sem DROP. Armazena apenas o PFX criptografado em repouso.

CREATE TABLE IF NOT EXISTS public.gd_cert_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL,
  label text NOT NULL,
  source_filename text,
  encrypted_payload text NOT NULL,
  cert_subject text,
  cert_issuer text,
  cert_serial text,
  cert_not_before timestamptz,
  cert_not_after timestamptz,
  cert_thumbprint_sha256 text,
  cert_thumbprint_sha1 text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gd_cert_profiles_owner_idx
  ON public.gd_cert_profiles (owner_user_id, created_at DESC);

ALTER TABLE public.gd_cert_profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_cert_profiles IS
  'Cofre de certificados digitais do signatario. O PFX fica criptografado em repouso.';

