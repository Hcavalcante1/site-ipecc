-- =============================================================================
-- RLS hardening — vazamentos de SELECT/UPDATE achados numa segunda passada
-- Referencia: docs/DIAGNOSTICO-CRONOGRAMA-RLS-2026-08-11.md
--
-- Encontrados ao puxar o texto exato das policies antes de consolidar as
-- 17 "multiple_permissive_policies" restantes (nao estavam no escopo do
-- primeiro diagnostico, que so cobriu um subconjunto de tabelas):
--
-- - transparencia: policy de UPDATE "Admin pode editar transparência" tinha
--   qual = auth.role() = 'authenticated' -- nome enganoso, liberava escrita
--   pra QUALQUER usuario logado, nao so admin. transparencia_update_admin
--   (is_admin) ja cobre o caso legitimo -- sem uso do cliente de sessao
--   nesta tabela no codigo (grep vazio), so remover.
-- - transparencia_convenios / transparencia_prestacao_contas: mesmo padrao
--   de editais/transparencia_editais corrigido antes -- policies SELECT
--   qual=true para anon e/ou authenticated anulavam o filtro
--   publicado=true de "public_read_*". Confirmado no codigo:
--   app/admin/paginas/transparencia/convenios/conveniosService.ts e
--   services/prestacaoContasService.ts leem via cliente de sessao
--   (@/lib/supabaseClient) -- precisam de policy is_admin() pra continuar
--   vendo registros nao publicados.
-- =============================================================================

begin;

drop policy if exists "Admin pode editar transparência" on public.transparencia;

drop policy if exists "anon_select_transparencia_convenios" on public.transparencia_convenios;
drop policy if exists "auth_select_transparencia_convenios" on public.transparencia_convenios;

create policy "transparencia_convenios_select_admin"
on public.transparencia_convenios for select to authenticated
using (is_admin((select auth.uid())));

drop policy if exists "anon_select_transparencia_prestacao" on public.transparencia_prestacao_contas;
drop policy if exists "auth_read_transparencia_prestacao" on public.transparencia_prestacao_contas;

create policy "transparencia_prestacao_select_admin"
on public.transparencia_prestacao_contas for select to authenticated
using (is_admin((select auth.uid())));

commit;

-- ---------------------------------------------------------------------------
-- Verificacao pos-aplicacao (rodar manualmente)
-- ---------------------------------------------------------------------------
-- select tablename, policyname, cmd, roles, qual from pg_policies
-- where schemaname='public'
--   and tablename in ('transparencia','transparencia_convenios','transparencia_prestacao_contas')
-- order by tablename, cmd, policyname;
-- Esperado: nenhuma policy SELECT com qual=true restando para anon/authenticated
-- nessas 3 tabelas; transparencia sem policy de UPDATE fora de
-- transparencia_update_admin.
