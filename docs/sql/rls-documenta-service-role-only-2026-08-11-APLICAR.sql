-- =============================================================================
-- RLS — documenta tabelas "service_role only" que hoje tem RLS ligado e
-- nenhuma policy.
-- Referencia: docs/DIAGNOSTICO-VALIDACAO-PLATAFORMA-2026-08-11.md (secao 2,
-- item "~50 tabelas com RLS habilitado e nenhuma policy")
--
-- Por que isso e um no-op de acesso:
-- - Com RLS ligado e zero policies, anon/authenticated ja ficam bloqueados
--   por padrao (deny-all implicito).
-- - service_role no Supabase tem BYPASSRLS a nivel de Postgres — ignora RLS
--   independente de existir policy ou nao.
-- A policy criada abaixo so formaliza esse comportamento (deixa auditavel) e
-- para o advisor de sinalizar "RLS Enabled No Policy" nessas tabelas.
--
-- Confirmado no codigo antes de aplicar: logs_download e escrito via
-- supabaseAdmin (service role) em app/api/download/[...path]/route.ts; o
-- fluxo de WhatsApp (leadPersist/conversationService) roda em rotas
-- server-side. As tabelas gd_*/digital_* fazem parte de modulos
-- (Gestao Documental, posts digitais) cujo acesso hoje e so via backend.
-- =============================================================================

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO public USING ((select auth.role()) = ''service_role'') WITH CHECK ((select auth.role()) = ''service_role'')',
      t.tablename || '_service_role_only',
      t.tablename
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Verificacao pos-aplicacao (rodar manualmente)
-- ---------------------------------------------------------------------------
-- select count(*) from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname='public' and c.relkind='r' and c.relrowsecurity=true
-- and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname);
-- Esperado: 0.
