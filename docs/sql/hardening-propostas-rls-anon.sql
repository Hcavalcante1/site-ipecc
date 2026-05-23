-- Hardening: restringir SELECT anon em propostas (executar no SQL Editor — STAGING primeiro)
-- Revise políticas existentes antes de aplicar. Ajuste is_admin() se a assinatura diferir.

-- 1) Listar políticas atuais
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies WHERE tablename = 'propostas';

-- 2) Exemplo: SELECT só para admins autenticados
-- DROP POLICY IF EXISTS "propostas_select_admin" ON public.propostas;
-- CREATE POLICY "propostas_select_admin"
--   ON public.propostas FOR SELECT
--   TO authenticated
--   USING (public.is_admin(auth.uid()));

-- 3) Garantir INSERT anon para envio público (se já existir, não duplicar)
-- CREATE POLICY "propostas_insert_anon"
--   ON public.propostas FOR INSERT
--   TO anon
--   WITH CHECK (true);

-- 4) Validar após aplicar:
-- npm run validar:seguranca  → anon SELECT propostas deve falhar ou retornar 0 linhas
