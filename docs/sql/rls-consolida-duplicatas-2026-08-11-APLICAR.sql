-- =============================================================================
-- RLS — consolida policies permissivas duplicadas (ruido de nomenclatura)
-- Referencia: docs/DIAGNOSTICO-VALIDACAO-PLATAFORMA-2026-08-11.md (secao 3)
--
-- Todas as policies removidas aqui tinham exatamente a mesma condicao que a
-- policy que sobrou no grupo (ou eram todas qual = true). Nao muda quem tem
-- acesso a que — so reduz o numero de policies avaliadas por query
-- (advisor "multiple_permissive_policies").
-- =============================================================================

begin;

-- ASSINATURAS: ALL/public, ambas auth.role() = 'service_role'
drop policy if exists "service role full access on assinaturas" on public.assinaturas;
drop policy if exists "service_role_all_assinaturas" on public.assinaturas;
create policy "assinaturas_service_role_all"
on public.assinaturas
for all
to public
using (( select auth.role() ) = 'service_role');

-- LOGS_ATIVIDADE: INSERT/anon, ambas with_check = true
drop policy if exists "allow insert logs" on public.logs_atividade;
drop policy if exists "allow_insert_logs" on public.logs_atividade;
create policy "logs_atividade_insert_anon"
on public.logs_atividade
for insert
to anon
with check (true);

-- EVENTOS: SELECT/public, ambas qual = true
drop policy if exists "eventos_public_read" on public.eventos;
drop policy if exists "public read eventos" on public.eventos;
create policy "eventos_public_select"
on public.eventos
for select
to public
using (true);

-- PAGINAS_CONTEUDO: SELECT/anon+public, 4 policies, todas qual = true
drop policy if exists "Public read paginas_conteudo" on public.paginas_conteudo;
drop policy if exists "allow_public_select" on public.paginas_conteudo;
drop policy if exists "allow_public_select_paginas_conteudo" on public.paginas_conteudo;
drop policy if exists "public_read_paginas_conteudo" on public.paginas_conteudo;
create policy "paginas_conteudo_public_select"
on public.paginas_conteudo
for select
to public
using (true);

-- PROJETOS_DESTAQUES: SELECT/public, ambas qual = true
drop policy if exists "allow read" on public.projetos_destaques;
drop policy if exists "public_read_projetos_destaques" on public.projetos_destaques;
create policy "projetos_destaques_public_select"
on public.projetos_destaques
for select
to public
using (true);

-- PROJETOS_RESULTADOS: SELECT/public, ambas qual = true
drop policy if exists "Permitir leitura pública" on public.projetos_resultados;
drop policy if exists "public_select" on public.projetos_resultados;
create policy "projetos_resultados_public_select"
on public.projetos_resultados
for select
to public
using (true);

commit;

-- ---------------------------------------------------------------------------
-- Verificacao pos-aplicacao (rodar manualmente)
-- ---------------------------------------------------------------------------
-- select tablename, cmd, roles, count(*)
-- from pg_policies
-- where schemaname = 'public' and permissive = 'PERMISSIVE'
--   and tablename in ('assinaturas','logs_atividade','eventos',
--                      'paginas_conteudo','projetos_destaques','projetos_resultados')
-- group by tablename, cmd, roles
-- order by tablename, cmd;
-- Esperado: 1 policy por grupo tablename/cmd/roles.
