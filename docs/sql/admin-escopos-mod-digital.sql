-- Digital no pacote de acessos (admin_escopos)
-- Aplicar no SQL Editor do Supabase após multi-admin-processos-fase-1.sql
-- Permite marcar o módulo Digital para operador/externo em /admin/acessos.

ALTER TABLE public.admin_escopos
  ADD COLUMN IF NOT EXISTS mod_digital boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.admin_escopos.mod_digital IS
  'Permite acesso ao módulo Digital (redes/fila) para operador/externo neste processo.';
