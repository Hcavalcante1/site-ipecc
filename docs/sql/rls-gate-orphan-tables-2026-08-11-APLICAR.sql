-- =============================================================================
-- RLS — fecha acesso total de "qualquer authenticated" em 7 tabelas orfas
-- Referencia: docs/DIAGNOSTICO-CRONOGRAMA-RLS-2026-08-11.md
--
-- Achado numa varredura completa (nao so nas tabelas que o advisor
-- multiple_permissive_policies sinalizava -- esse lint so pega policies
-- REDUNDANTES, uma policy sozinha perigosamente aberta nunca aparece nele).
-- Procurei por qual/with_check = 'true' ou auth.role()='authenticated' em
-- todo o schema public e achei 7 tabelas com FOR ALL/SELECT/UPDATE liberado
-- pra QUALQUER authenticated, sem nenhum gate de is_admin() -- diferente do
-- padrao usado em todo o resto do banco:
--
-- - api_tokens, beneficiarios, org_membros, organizacoes, portal_tokens,
--   lgpd_consentimentos, lgpd_solicitacoes
--
-- Gravidade: nao ha nenhum fluxo de auto-cadastro (signUp) em nenhum lugar
-- do app -- "authenticated" so pode ser conta de staff criada manualmente,
-- nao qualquer visitante. Mas ainda e uma falha real: qualquer funcionario
-- logado (nao so admin) tinha acesso total a dados de LGPD (solicitacoes e
-- consentimentos de titulares), beneficiarios, tokens de portal e tokens de
-- API. Nenhuma dessas 7 tabelas tem um unico consumidor no codigo (grep
-- vazio em app/, lib/, services/, scripts/) -- sao estruturas sem feature
-- construida ainda, apertar o acesso nao quebra nada em uso hoje.
--
-- Fix: aplica o mesmo padrao is_admin() usado em todo o resto do banco.
-- Mantidos os INSERTs publicos ja existentes (anon_insert_lgpd_solicitacoes,
-- anon_insert_lgpd_consentimentos) -- sao os pontos de entrada publicos
-- pretendidos (formulario de solicitacao/consentimento LGPD).
-- =============================================================================

begin;

drop policy if exists "auth_all_api_tokens" on public.api_tokens;
create policy "api_tokens_admin_all"
on public.api_tokens for all to authenticated
using (is_admin((select auth.uid())))
with check (is_admin((select auth.uid())));

drop policy if exists "beneficiarios_auth_all" on public.beneficiarios;
create policy "beneficiarios_admin_all"
on public.beneficiarios for all to authenticated
using (is_admin((select auth.uid())))
with check (is_admin((select auth.uid())));

drop policy if exists "auth_all_org_membros" on public.org_membros;
create policy "org_membros_admin_all"
on public.org_membros for all to authenticated
using (is_admin((select auth.uid())))
with check (is_admin((select auth.uid())));

drop policy if exists "auth_insert_organizacoes" on public.organizacoes;
drop policy if exists "auth_select_organizacoes" on public.organizacoes;
drop policy if exists "auth_update_organizacoes" on public.organizacoes;
create policy "organizacoes_admin_all"
on public.organizacoes for all to authenticated
using (is_admin((select auth.uid())))
with check (is_admin((select auth.uid())));

drop policy if exists "portal_tokens_auth_all" on public.portal_tokens;
create policy "portal_tokens_admin_all"
on public.portal_tokens for all to authenticated
using (is_admin((select auth.uid())))
with check (is_admin((select auth.uid())));

drop policy if exists "auth_select_lgpd_solicitacoes" on public.lgpd_solicitacoes;
drop policy if exists "auth_update_lgpd_solicitacoes" on public.lgpd_solicitacoes;
create policy "lgpd_solicitacoes_select_admin"
on public.lgpd_solicitacoes for select to authenticated
using (is_admin((select auth.uid())));
create policy "lgpd_solicitacoes_update_admin"
on public.lgpd_solicitacoes for update to authenticated
using (is_admin((select auth.uid())))
with check (is_admin((select auth.uid())));

drop policy if exists "auth_select_lgpd_consentimentos" on public.lgpd_consentimentos;
create policy "lgpd_consentimentos_select_admin"
on public.lgpd_consentimentos for select to authenticated
using (is_admin((select auth.uid())));

commit;

-- ---------------------------------------------------------------------------
-- Verificacao pos-aplicacao (rodar manualmente)
-- ---------------------------------------------------------------------------
-- select tablename, policyname, cmd, roles, qual from pg_policies
-- where schemaname='public'
--   and tablename in ('api_tokens','beneficiarios','org_membros','organizacoes',
--                      'portal_tokens','lgpd_solicitacoes','lgpd_consentimentos')
-- order by tablename, cmd, policyname;
-- Esperado: nenhuma policy com qual='true' ou auth.role()='authenticated'
-- restando pra authenticated nessas 7 tabelas.
--
-- ATENCAO se algum dia construir a feature dessas tabelas: os usuarios que
-- vao operar org_membros/organizacoes/portal_tokens pelo painel vao
-- precisar ser is_admin() ou a policy vai precisar ser revisada pra
-- refletir o modelo de permissao real da feature (ex.: dono da org, nao
-- so admin global).
