-- Gestão Documental — Fase 1
-- Tabelas normalizadas (prefixo gd_). Tenant = processo_id (multi-admin).
-- Soft delete via deleted_at. Escrita via API admin (service role).
-- Aplicar manualmente no Supabase junto com:
--   docs/sql/admin-escopos-mod-documentos.sql
--   docs/sql/gestao-documental-storage-bucket.sql

-- ---------------------------------------------------------------------------
-- Pastas e categorias
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos_contratacao (id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.gd_folders (id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS gd_folders_processo_idx
  ON public.gd_folders (processo_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_folders_parent_idx
  ON public.gd_folders (parent_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.gd_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos_contratacao (id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text,
  description text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS gd_categories_processo_slug_uidx
  ON public.gd_categories (processo_id, slug)
  WHERE deleted_at IS NULL AND slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS gd_categories_processo_idx
  ON public.gd_categories (processo_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Documentos e versões
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos_contratacao (id) ON DELETE SET NULL,
  folder_id uuid REFERENCES public.gd_folders (id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.gd_categories (id) ON DELETE SET NULL,
  title text NOT NULL,
  number text,
  description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'in_review',
      'awaiting_approval',
      'approved',
      'rejected',
      'ready_to_sign',
      'signed',
      'archived'
    )),
  current_version int NOT NULL DEFAULT 0,
  favorite boolean NOT NULL DEFAULT false,
  storage_path text,
  mime_type text,
  file_name text,
  file_size bigint,
  file_hash text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS gd_documents_processo_idx
  ON public.gd_documents (processo_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_documents_status_idx
  ON public.gd_documents (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_documents_folder_idx
  ON public.gd_documents (folder_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_documents_title_idx
  ON public.gd_documents (title)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.gd_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE CASCADE,
  version_number int NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_name text,
  file_size bigint,
  file_hash text,
  change_note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS gd_document_versions_doc_idx
  ON public.gd_document_versions (document_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.gd_document_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (document_id, tag)
);

CREATE TABLE IF NOT EXISTS public.gd_document_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid,
  document_id uuid REFERENCES public.gd_documents (id) ON DELETE SET NULL,
  batch_id uuid,
  action text NOT NULL,
  detail jsonb,
  actor_id text,
  actor_email text,
  ip text,
  user_agent text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS gd_document_logs_doc_idx
  ON public.gd_document_logs (document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gd_document_logs_processo_idx
  ON public.gd_document_logs (processo_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Modelos, workflow e permissões (esqueleto Fase 1)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos_contratacao (id) ON DELETE SET NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'contrato'
    CHECK (kind IN (
      'contrato',
      'oficio',
      'declaracao',
      'plano_trabalho',
      'prestacao_contas',
      'convenio',
      'relatorio',
      'ata',
      'termo',
      'pdf',
      'docx',
      'html',
      'outro'
    )),
  format text NOT NULL DEFAULT 'pdf'
    CHECK (format IN ('pdf', 'docx', 'html')),
  body text,
  storage_path text,
  ativo boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gd_document_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos_contratacao (id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gd_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.gd_document_workflows (id) ON DELETE CASCADE,
  step_order int NOT NULL,
  name text NOT NULL,
  from_status text,
  to_status text,
  role_required text,
  parallel boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (workflow_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.gd_workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.gd_document_workflows (id) ON DELETE SET NULL,
  step_id uuid REFERENCES public.gd_workflow_steps (id) ON DELETE SET NULL,
  from_status text,
  to_status text,
  comment text,
  actor_id text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gd_document_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.gd_documents (id) ON DELETE CASCADE,
  processo_id uuid REFERENCES public.processos_contratacao (id) ON DELETE CASCADE,
  subject_type text NOT NULL
    CHECK (subject_type IN ('user', 'group', 'role')),
  subject_id text NOT NULL,
  permission text NOT NULL
    CHECK (permission IN (
      'admin',
      'gestor',
      'revisor',
      'aprovador',
      'signatario',
      'consulta'
    )),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS gd_document_permissions_doc_idx
  ON public.gd_document_permissions (document_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Assinatura digital (schema; integração gov.br = Fase 4)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gd_signature_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE
    CHECK (code IN (
      'govbr',
      'icp_brasil',
      'clicksign',
      'autentique',
      'docusign',
      'zapsign',
      'adobe_sign'
    )),
  name text NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

INSERT INTO public.gd_signature_providers (code, name, ativo)
VALUES ('govbr', 'Assinatura Avançada gov.br', false)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.gd_signature_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.gd_document_versions (id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.gd_signature_providers (id) ON DELETE SET NULL,
  provider_code text NOT NULL DEFAULT 'govbr',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'authorizing',
      'ready',
      'signing',
      'signed',
      'failed',
      'cancelled'
    )),
  external_session_id text,
  signed_storage_path text,
  signed_hash text,
  error_message text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gd_signature_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos_contratacao (id) ON DELETE SET NULL,
  title text NOT NULL,
  provider_code text NOT NULL DEFAULT 'govbr',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'ready',
      'running',
      'paused',
      'completed',
      'failed',
      'cancelled'
    )),
  progress_done int NOT NULL DEFAULT 0,
  progress_total int NOT NULL DEFAULT 0,
  error_message text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gd_signature_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.gd_signature_batches (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.gd_documents (id) ON DELETE CASCADE,
  signature_document_id uuid REFERENCES public.gd_signature_documents (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'running',
      'signed',
      'failed',
      'cancelled',
      'skipped'
    )),
  error_message text,
  sort_order int NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gd_signature_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_document_id uuid REFERENCES public.gd_signature_documents (id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.gd_signature_batches (id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.gd_documents (id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  cpf text,
  user_id text,
  mode text NOT NULL DEFAULT 'parallel'
    CHECK (mode IN ('sequential', 'parallel')),
  required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  deadline_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'notified',
      'signed',
      'rejected',
      'expired',
      'cancelled'
    )),
  signed_at timestamptz,
  rejection_reason text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gd_signature_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_document_id uuid REFERENCES public.gd_signature_documents (id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.gd_signature_batches (id) ON DELETE SET NULL,
  signer_id uuid REFERENCES public.gd_signature_signers (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb,
  ip text,
  user_agent text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS: sem acesso anon; APIs admin usam service role
-- ---------------------------------------------------------------------------

ALTER TABLE public.gd_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_document_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_document_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_signature_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_signature_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_signature_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_signature_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_signature_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_signature_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gd_documents IS
  'Gestão Documental Fase 1 — metadados e versão corrente.';
COMMENT ON TABLE public.gd_signature_providers IS
  'Provedores de assinatura (gov.br primeiro; demais futuros).';
