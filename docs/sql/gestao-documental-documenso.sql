-- Gestão Documental — provedor Documento (assinatura ente privado)
-- Código interno: documento (motor open source self-host em services/documenso)

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
    'documento',
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
VALUES ('documento', 'Documento', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  ativo = true,
  updated_at = now();

-- Migra seed legado documenso → documento
UPDATE public.gd_signature_documents
SET provider_code = 'documento', updated_at = now()
WHERE provider_code = 'documenso';

UPDATE public.gd_signature_batches
SET provider_code = 'documento', updated_at = now()
WHERE provider_code = 'documenso';

UPDATE public.gd_signature_providers
SET ativo = false, updated_at = now()
WHERE code IN ('govbr', 'documenso');

ALTER TABLE public.gd_signature_documents
  ALTER COLUMN provider_code SET DEFAULT 'documento';

ALTER TABLE public.gd_signature_batches
  ALTER COLUMN provider_code SET DEFAULT 'documento';

COMMENT ON TABLE public.gd_signature_providers IS
  'Provedores: documento (padrão ente privado), govbr (órgãos públicos), demais futuros.';
