-- =============================================================================
-- RLS — corrige bug funcional em editais_logs + acaba de padronizar
-- role={public}->{authenticated} nas policies _admin restantes
-- Referencia: docs/DIAGNOSTICO-CRONOGRAMA-RLS-2026-08-11.md
--
-- 1) editais_logs tinha SO uma policy: "editais_logs_admin_only_no_anon"
--    (FOR ALL, qual=false) -- nega TODO MUNDO sempre, inclusive admin. Nao
--    e vazamento, e o oposto: bug funcional. Confirmado no codigo
--    (app/admin/editais/[id]/governanca/page.tsx linhas 730 e 1037-1040)
--    que insere e deleta em editais_logs via cliente de sessao -- estava
--    falhando silenciosamente pra admin de verdade (o insert nem checa o
--    erro). Fix: policy is_admin() para select/insert/delete, mesmo
--    padrao usado em todo o resto do banco.
--
-- 2) contato_mensagens e proposta_anexos tinham policies "_admin" com
--    role={public} em vez de {authenticated} -- mesmo padrao ja corrigido
--    em projetos hoje. Inofensivo (is_admin(auth.uid()) sempre falso pra
--    anon), mas padronizado por consistencia.
-- =============================================================================

begin;

drop policy if exists "editais_logs_admin_only_no_anon" on public.editais_logs;

create policy "editais_logs_select_admin"
on public.editais_logs for select to authenticated
using (is_admin((select auth.uid())));

create policy "editais_logs_insert_admin"
on public.editais_logs for insert to authenticated
with check (is_admin((select auth.uid())));

create policy "editais_logs_delete_admin"
on public.editais_logs for delete to authenticated
using (is_admin((select auth.uid())));

alter policy "contato_select_admin" on public.contato_mensagens to authenticated;

alter policy "proposta_anexos_select_admin" on public.proposta_anexos to authenticated;
alter policy "proposta_anexos_insert_admin" on public.proposta_anexos to authenticated;
alter policy "proposta_anexos_update_admin" on public.proposta_anexos to authenticated;
alter policy "proposta_anexos_delete_admin" on public.proposta_anexos to authenticated;

commit;

-- Verificacao: select tablename, policyname, cmd, roles, qual from pg_policies
-- where schemaname='public' and tablename in ('editais_logs','contato_mensagens','proposta_anexos')
-- order by tablename, cmd, policyname;
-- Esperado: editais_logs com 3 policies is_admin() (select/insert/delete);
-- contato_mensagens e proposta_anexos com roles={authenticated} nas _admin.
