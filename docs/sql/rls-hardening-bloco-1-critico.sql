-- RLS hardening - bloco 1 critico
-- Execute primeiro este bloco, teste o admin, e somente depois avance para o SQL completo.
--
-- Tabelas cobertas:
-- - editais
-- - eventos
-- - paginas / paginas_conteudo
-- - transparencia
-- - transparencia_editais
-- - transparencia_convenios
-- - transparencia_prestacao_contas
--
-- Antes de executar:
-- select is_admin(auth.uid());
-- deve funcionar quando logado como admin no Supabase/Auth.

begin;

-- EDITAIS: remove escrita ampla para qualquer authenticated.
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

-- EVENTOS: remove escrita publica total.
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

-- CMS PRINCIPAL: remove escrita para qualquer usuario autenticado.
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

drop policy if exists "authenticated_full_access" on public.paginas_conteudo;

create policy "paginas_conteudo_admin_all"
on public.paginas_conteudo
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

-- TRANSPARENCIA: remove escrita ampla.
drop policy if exists "Admin pode editar transparencia" on public.transparencia;

create policy "transparencia_update_admin"
on public.transparencia
for update
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

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

commit;
