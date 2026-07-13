-- Gestão Documental no pacote de acessos (admin_escopos)
-- Aplicar no SQL Editor do Supabase após multi-admin-processos-fase-1.sql
-- Permite marcar o módulo Documentos para operador/externo em /admin/acessos.

ALTER TABLE public.admin_escopos
  ADD COLUMN IF NOT EXISTS mod_documentos boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.admin_escopos.mod_documentos IS
  'Permite acesso ao módulo Gestão Documental para operador/externo neste processo.';
