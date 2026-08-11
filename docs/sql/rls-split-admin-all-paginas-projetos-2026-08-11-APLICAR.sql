-- =============================================================================
-- RLS — remove overlap de SELECT redundante em paginas_*/projetos_*
-- Referencia: docs/DIAGNOSTICO-CRONOGRAMA-RLS-2026-08-11.md
--
-- Padrao repetido em 8 tabelas: policy "<tabela>_admin_all" FOR ALL
-- (authenticated, is_admin()) convivendo com uma policy publica de SELECT
-- com qual = true (paginas_blocos, paginas_cards, paginas_conteudo,
-- paginas_eixos, paginas_itens, projetos_destaques, projetos_eixos,
-- projetos_resultados). Como a policy publica ja libera SELECT pra
-- qualquer um (inclusive admin), o SELECT de admin_all nunca adiciona
-- visibilidade nenhuma -- e sempre verdade que is_admin() implica true.
--
-- Fix: cada "<tabela>_admin_all" vira 3 policies (insert/update/delete),
-- mesma condicao, sem a parte de SELECT que ja era redundante. Zero
-- mudanca de acesso; usa (select auth.uid()) desde o inicio (evita o
-- auth_rls_initplan que apareceu numa correcao anterior).
-- =============================================================================

begin;

drop policy if exists "paginas_blocos_admin_all" on public.paginas_blocos;
create policy "paginas_blocos_insert_admin" on public.paginas_blocos for insert to authenticated with check (is_admin((select auth.uid())));
create policy "paginas_blocos_update_admin" on public.paginas_blocos for update to authenticated using (is_admin((select auth.uid()))) with check (is_admin((select auth.uid())));
create policy "paginas_blocos_delete_admin" on public.paginas_blocos for delete to authenticated using (is_admin((select auth.uid())));

drop policy if exists "paginas_cards_admin_all" on public.paginas_cards;
create policy "paginas_cards_insert_admin" on public.paginas_cards for insert to authenticated with check (is_admin((select auth.uid())));
create policy "paginas_cards_update_admin" on public.paginas_cards for update to authenticated using (is_admin((select auth.uid()))) with check (is_admin((select auth.uid())));
create policy "paginas_cards_delete_admin" on public.paginas_cards for delete to authenticated using (is_admin((select auth.uid())));

drop policy if exists "paginas_conteudo_admin_all" on public.paginas_conteudo;
create policy "paginas_conteudo_insert_admin" on public.paginas_conteudo for insert to authenticated with check (is_admin((select auth.uid())));
create policy "paginas_conteudo_update_admin" on public.paginas_conteudo for update to authenticated using (is_admin((select auth.uid()))) with check (is_admin((select auth.uid())));
create policy "paginas_conteudo_delete_admin" on public.paginas_conteudo for delete to authenticated using (is_admin((select auth.uid())));

drop policy if exists "paginas_eixos_admin_all" on public.paginas_eixos;
create policy "paginas_eixos_insert_admin" on public.paginas_eixos for insert to authenticated with check (is_admin((select auth.uid())));
create policy "paginas_eixos_update_admin" on public.paginas_eixos for update to authenticated using (is_admin((select auth.uid()))) with check (is_admin((select auth.uid())));
create policy "paginas_eixos_delete_admin" on public.paginas_eixos for delete to authenticated using (is_admin((select auth.uid())));

drop policy if exists "paginas_itens_admin_all" on public.paginas_itens;
create policy "paginas_itens_insert_admin" on public.paginas_itens for insert to authenticated with check (is_admin((select auth.uid())));
create policy "paginas_itens_update_admin" on public.paginas_itens for update to authenticated using (is_admin((select auth.uid()))) with check (is_admin((select auth.uid())));
create policy "paginas_itens_delete_admin" on public.paginas_itens for delete to authenticated using (is_admin((select auth.uid())));

drop policy if exists "projetos_destaques_admin_all" on public.projetos_destaques;
create policy "projetos_destaques_insert_admin" on public.projetos_destaques for insert to authenticated with check (is_admin((select auth.uid())));
create policy "projetos_destaques_update_admin" on public.projetos_destaques for update to authenticated using (is_admin((select auth.uid()))) with check (is_admin((select auth.uid())));
create policy "projetos_destaques_delete_admin" on public.projetos_destaques for delete to authenticated using (is_admin((select auth.uid())));

drop policy if exists "projetos_eixos_admin_all" on public.projetos_eixos;
create policy "projetos_eixos_insert_admin" on public.projetos_eixos for insert to authenticated with check (is_admin((select auth.uid())));
create policy "projetos_eixos_update_admin" on public.projetos_eixos for update to authenticated using (is_admin((select auth.uid()))) with check (is_admin((select auth.uid())));
create policy "projetos_eixos_delete_admin" on public.projetos_eixos for delete to authenticated using (is_admin((select auth.uid())));

drop policy if exists "projetos_resultados_admin_all" on public.projetos_resultados;
create policy "projetos_resultados_insert_admin" on public.projetos_resultados for insert to authenticated with check (is_admin((select auth.uid())));
create policy "projetos_resultados_update_admin" on public.projetos_resultados for update to authenticated using (is_admin((select auth.uid()))) with check (is_admin((select auth.uid())));
create policy "projetos_resultados_delete_admin" on public.projetos_resultados for delete to authenticated using (is_admin((select auth.uid())));

commit;

-- ---------------------------------------------------------------------------
-- Verificacao pos-aplicacao (rodar manualmente)
-- ---------------------------------------------------------------------------
-- select tablename, cmd, roles, count(*) from pg_policies
-- where schemaname='public' and permissive='PERMISSIVE'
--   and tablename in ('paginas_blocos','paginas_cards','paginas_conteudo',
--                      'paginas_eixos','paginas_itens','projetos_destaques',
--                      'projetos_eixos','projetos_resultados')
-- group by tablename, cmd, roles having count(*) > 1;
-- Esperado: 0 linhas.
