-- RLS hardening - bloco 2 conteudo e logs
-- Execute somente depois de validar o bloco 1.
--
-- Objetivo:
-- - Fechar escritas publicas restantes em conteudos editaveis pelo admin.
-- - Fechar leitura publica de logs.
-- - Manter leitura publica de conteudo publicado.
-- - Manter formulario publico de propostas funcionando.

begin;

-- LOGS
drop policy if exists "admin insert logs" on public.admin_logs;
drop policy if exists "admin read logs" on public.admin_logs;

create policy "admin_logs_insert_admin"
on public.admin_logs
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "admin_logs_select_admin"
on public.admin_logs
for select
to authenticated
using (is_admin(auth.uid()));

drop policy if exists "allow_select_logs" on public.logs_atividade;

-- Mantem INSERT anon em logs_atividade por enquanto, caso alguma rotina publica use esse registro.
-- Recomendacao futura: trocar esse fluxo para API server-side com rate limit.

-- CTAS
drop policy if exists "admin write ctas" on public.ctas;
drop policy if exists "admin update ctas" on public.ctas;

create policy "ctas_insert_admin"
on public.ctas
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "ctas_update_admin"
on public.ctas
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "ctas_delete_admin"
on public.ctas
for delete
to authenticated
using (is_admin(auth.uid()));

-- DEPOIMENTOS
drop policy if exists "anon_insert_depoimentos" on public.depoimentos;
drop policy if exists "anon_delete_depoimentos" on public.depoimentos;

create policy "depoimentos_insert_admin"
on public.depoimentos
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "depoimentos_update_admin"
on public.depoimentos
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "depoimentos_delete_admin"
on public.depoimentos
for delete
to authenticated
using (is_admin(auth.uid()));

-- PROJETOS
drop policy if exists "allow insert" on public.projetos_destaques;
drop policy if exists "allow update" on public.projetos_destaques;
drop policy if exists "allow delete" on public.projetos_destaques;

create policy "projetos_destaques_admin_all"
on public.projetos_destaques
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

drop policy if exists "admin_full_access_projetos_eixos" on public.projetos_eixos;

create policy "projetos_eixos_admin_all"
on public.projetos_eixos
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

drop policy if exists "Permitir delete admin" on public.projetos_resultados;
drop policy if exists "Permitir insert admin" on public.projetos_resultados;
drop policy if exists "admin_delete_projetos_resultados" on public.projetos_resultados;
drop policy if exists "admin_insert_projetos_resultados" on public.projetos_resultados;
drop policy if exists "admin_update_projetos_resultados" on public.projetos_resultados;
drop policy if exists "public_delete" on public.projetos_resultados;
drop policy if exists "public_insert" on public.projetos_resultados;

create policy "projetos_resultados_admin_all"
on public.projetos_resultados
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

-- QUEM SOMOS
drop policy if exists "Admin full access" on public.quem_somos_atuacao;

create policy "quem_somos_atuacao_admin_all"
on public.quem_somos_atuacao
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

-- PAGINAS RELACIONAIS RESTANTES
drop policy if exists "Admin edita blocos" on public.paginas_blocos;
drop policy if exists "Admin edita cards" on public.paginas_cards;
drop policy if exists "Admin edita itens" on public.paginas_itens;

create policy "paginas_blocos_admin_all"
on public.paginas_blocos
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "paginas_cards_admin_all"
on public.paginas_cards
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "paginas_itens_admin_all"
on public.paginas_itens
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

drop policy if exists "admin_full_access_paginas_eixos" on public.paginas_eixos;

create policy "paginas_eixos_admin_all"
on public.paginas_eixos
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

-- PROPOSTAS / ANEXOS
drop policy if exists "Admin pode ver anexos" on public.propostas_anexos;

create policy "propostas_anexos_select_admin"
on public.propostas_anexos
for select
to authenticated
using (is_admin(auth.uid()));

-- Mantem:
-- - propostas_insert_anon
-- - Public pode inserir anexos
-- Esses dois sao necessarios para o formulario publico de propostas.

commit;
