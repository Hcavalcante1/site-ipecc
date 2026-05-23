-- =============================================================================
-- Hardening RLS — tabela propostas (STAGING/DEV primeiro)
-- Objetivo: anon só INSERT; SELECT/UPDATE/DELETE só admin autenticado
-- Antes: npm run validar:seguranca  (esperado: FALHA anon SELECT)
-- Depois: npm run validar:pos-hardening-rls
-- Rollback: restaurar políticas anteriores via backup Dashboard ou pg_policies dump
-- =============================================================================

-- PASSO 0 — Inspecionar (opcional, só leitura)
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'propostas'
-- ORDER BY policyname;

-- PASSO 1 — Remover todas as políticas atuais em propostas
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'propostas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.propostas', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- PASSO 2 — Políticas mínimas
-- Envio público /propostas (anon)
CREATE POLICY "propostas_insert_anon"
  ON public.propostas
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Admin autenticado (mesmo padrão proposta_anexos)
CREATE POLICY "propostas_select_admin"
  ON public.propostas
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "propostas_insert_admin"
  ON public.propostas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "propostas_update_admin"
  ON public.propostas
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "propostas_delete_admin"
  ON public.propostas
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- PASSO 3 — Conferir
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'propostas';
