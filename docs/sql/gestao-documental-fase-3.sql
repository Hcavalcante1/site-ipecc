-- Gestão Documental — Fase 3
-- Vincula documento a um fluxo e índices de permissão/histórico.
-- Aplicar após gestao-documental-fase-1.sql

ALTER TABLE public.gd_documents
  ADD COLUMN IF NOT EXISTS workflow_id uuid
    REFERENCES public.gd_document_workflows (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gd_documents_workflow_idx
  ON public.gd_documents (workflow_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_workflow_steps_workflow_idx
  ON public.gd_workflow_steps (workflow_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gd_workflow_history_doc_idx
  ON public.gd_workflow_history (document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gd_document_permissions_subject_idx
  ON public.gd_document_permissions (subject_type, subject_id)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.gd_documents.workflow_id IS
  'Fluxo de trabalho vinculado ao documento (Fase 3).';
