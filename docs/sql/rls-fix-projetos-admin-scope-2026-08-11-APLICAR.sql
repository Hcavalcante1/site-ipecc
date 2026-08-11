-- =============================================================================
-- RLS — corrige escopo de role das policies admin em projetos
-- Referencia: docs/DIAGNOSTICO-CRONOGRAMA-RLS-2026-08-11.md
--
-- As 4 policies "projetos_*_admin" (select/insert/update/delete) estavam
-- com roles={public} em vez de {authenticated} -- unico lugar no banco com
-- esse padrao. Inofensivo hoje porque is_admin(auth.uid()) sempre retorna
-- falso para anon (auth.uid() e null sem sessao), mas evaluar a policy
-- para anon tambem e o motivo do advisor sinalizar
-- multiple_permissive_policies em SELECT (junto com projetos_select_publico).
--
-- Fix: restringe as 4 policies para role authenticated, mesma condicao.
-- Zero mudanca de acesso -- anon nunca satisfazia is_admin() mesmo antes.
-- =============================================================================

begin;

alter policy "projetos_select_admin" on public.projetos to authenticated;
alter policy "projetos_insert_admin" on public.projetos to authenticated;
alter policy "projetos_update_admin" on public.projetos to authenticated;
alter policy "projetos_delete_admin" on public.projetos to authenticated;

commit;

-- Verificacao: select policyname, cmd, roles from pg_policies
-- where schemaname='public' and tablename='projetos' order by cmd, policyname;
-- Esperado: as 4 policies _admin com roles={authenticated}.
