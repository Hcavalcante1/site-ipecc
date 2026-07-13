-- Gestão Documental — provedor Documenso (ente privado / self-hosted)
-- Aplique no SQL Editor do Supabase após gestao-documental-fase-1.sql

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
    'documenso',
    'govbr',
    'icp_brasil',
    'clicksign',
    'autentique',
    'docusign',
    'zapsign',
    'adobe_sign'
  ));

INSERT INTO public.gd_signature_providers (code, name, ativo)
VALUES ('documenso', 'Documenso (open source)', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  ativo = true,
  updated_at = now();

UPDATE public.gd_signature_providers
SET ativo = false, updated_at = now()
WHERE code = 'govbr';

COMMENT ON TABLE public.gd_signature_providers IS
  'Provedores de assinatura: documenso (padrão ente privado), govbr (órgãos públicos), demais futuros.';
