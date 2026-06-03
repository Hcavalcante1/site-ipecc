-- RLS hardening - IPECC
-- Objetivo:
-- - Manter leitura publica onde o site precisa exibir conteudo.
-- - Bloquear INSERT/UPDATE/DELETE feitos por anon/public.
-- - Permitir escrita apenas para usuarios admin via is_admin(auth.uid()).
--
-- IMPORTANTE:
-- 1. Revise antes de executar.
-- 2. Execute primeiro em staging, se houver.
-- 3. Garanta que a funcao public.is_admin(uuid) existe e funciona.
-- 4. Nao execute junto com outras mudancas.

begin;

-- =========================================================
-- LOGS
-- =========================================================

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

-- Mantem insert anon se o site publico ainda registrar logs.
-- Recomendacao futura: mover logs publicos para API server-side com rate limit.

-- =========================================================
-- EDITAIS
-- =========================================================

drop policy if exists "admin_full_access_editais" on public.editais;
drop policy if exists "admin_insert_editais" on public.editais;
drop policy if exists "admin_update_editais" on public.editais;

create policy "editais_insert_admin"
on public.editais
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "editais_update_admin"
on public.editais
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "editais_delete_admin"
on public.editais
for delete
to authenticated
using (is_admin(auth.uid()));

-- Mantem policies SELECT existentes para nao quebrar a pagina publica.
-- Recomendacao futura: consolidar SELECT publico em apenas uma policy com ativo = true.

-- =========================================================
-- EVENTOS
-- =========================================================

drop policy if exists "eventos_admin_all" on public.eventos;

create policy "eventos_insert_admin"
on public.eventos
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "eventos_update_admin"
on public.eventos
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "eventos_delete_admin"
on public.eventos
for delete
to authenticated
using (is_admin(auth.uid()));

-- =========================================================
-- CMS / PAGINAS
-- =========================================================

drop policy if exists "auth_insert_paginas" on public.paginas;
drop policy if exists "auth_update_paginas" on public.paginas;

create policy "paginas_insert_admin"
on public.paginas
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "paginas_update_admin"
on public.paginas
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "paginas_delete_admin"
on public.paginas
for delete
to authenticated
using (is_admin(auth.uid()));

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

drop policy if exists "authenticated_full_access" on public.paginas_conteudo;

create policy "paginas_conteudo_admin_all"
on public.paginas_conteudo
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

-- =========================================================
-- TRANSPARENCIA
-- =========================================================

drop policy if exists "Admin pode editar transparencia" on public.transparencia;

create policy "transparencia_update_admin"
on public.transparencia
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

drop policy if exists "anon_delete_transparencia_convenios" on public.transparencia_convenios;
drop policy if exists "anon_insert_transparencia_convenios" on public.transparencia_convenios;
drop policy if exists "anon_update_transparencia_convenios" on public.transparencia_convenios;
drop policy if exists "auth_delete_transparencia_convenios" on public.transparencia_convenios;
drop policy if exists "auth_insert_transparencia_convenios" on public.transparencia_convenios;
drop policy if exists "auth_update_transparencia_convenios" on public.transparencia_convenios;

create policy "transparencia_convenios_insert_admin"
on public.transparencia_convenios
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "transparencia_convenios_update_admin"
on public.transparencia_convenios
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "transparencia_convenios_delete_admin"
on public.transparencia_convenios
for delete
to authenticated
using (is_admin(auth.uid()));

drop policy if exists "anon_delete_transparencia_editais" on public.transparencia_editais;
drop policy if exists "anon_insert_transparencia_editais" on public.transparencia_editais;
drop policy if exists "anon_update_transparencia_editais" on public.transparencia_editais;
drop policy if exists "auth_delete_transparencia_editais" on public.transparencia_editais;
drop policy if exists "auth_insert_transparencia_editais" on public.transparencia_editais;
drop policy if exists "auth_update_transparencia_editais" on public.transparencia_editais;

create policy "transparencia_editais_insert_admin"
on public.transparencia_editais
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "transparencia_editais_update_admin"
on public.transparencia_editais
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "transparencia_editais_delete_admin"
on public.transparencia_editais
for delete
to authenticated
using (is_admin(auth.uid()));

drop policy if exists "anon_delete_transparencia_prestacao" on public.transparencia_prestacao_contas;
drop policy if exists "anon_insert_transparencia_prestacao" on public.transparencia_prestacao_contas;
drop policy if exists "anon_update_transparencia_prestacao" on public.transparencia_prestacao_contas;
drop policy if exists "auth_delete_transparencia_prestacao" on public.transparencia_prestacao_contas;
drop policy if exists "auth_insert_transparencia_prestacao" on public.transparencia_prestacao_contas;
drop policy if exists "auth_update_transparencia_prestacao" on public.transparencia_prestacao_contas;

create policy "transparencia_prestacao_insert_admin"
on public.transparencia_prestacao_contas
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "transparencia_prestacao_update_admin"
on public.transparencia_prestacao_contas
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "transparencia_prestacao_delete_admin"
on public.transparencia_prestacao_contas
for delete
to authenticated
using (is_admin(auth.uid()));

-- =========================================================
-- CONTEUDOS PUBLICOS EDITAVEIS PELO ADMIN
-- =========================================================

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

drop policy if exists "anon_insert_depoimentos" on public.depoimentos;
drop policy if exists "anon_delete_depoimentos" on public.depoimentos;

create policy "depoimentos_insert_admin"
on public.depoimentos
for insert
to authenticated
with check (is_admin(auth.uid()));

create policy "depoimentos_delete_admin"
on public.depoimentos
for delete
to authenticated
using (is_admin(auth.uid()));

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

drop policy if exists "Admin full access" on public.quem_somos_atuacao;

create policy "quem_somos_atuacao_admin_all"
on public.quem_somos_atuacao
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

-- =========================================================
-- PROPOSTAS / ANEXOS
-- =========================================================

drop policy if exists "Admin pode ver anexos" on public.propostas_anexos;

create policy "propostas_anexos_select_admin"
on public.propostas_anexos
for select
to authenticated
using (is_admin(auth.uid()));

-- Mantem INSERT anon em propostas e propostas_anexos para o formulario publico.
-- Downloads de anexos continuam protegidos pela API.

commit;
