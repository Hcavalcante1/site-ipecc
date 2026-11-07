-- Restrict site-submitted proposals and their attachments to the master admin.
-- Public submission inserts remain available; public users cannot read existing submissions.

create or replace function public.is_mestre_ou_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(public.is_admin(auth.uid()), false)
    or exists (
      select 1
      from public.admin_perfis p
      where p.user_id = auth.uid()
        and p.ativo = true
        and p.papel = 'mestre'
    );
$$;

revoke all on function public.is_mestre_ou_admin() from public, anon;
grant execute on function public.is_mestre_ou_admin() to authenticated, service_role;

alter table public.propostas enable row level security;
alter table public.proposta_anexos enable row level security;
alter table public.admin_proposta_escopos enable row level security;

drop policy if exists propostas_select_admin on public.propostas;
drop policy if exists propostas_insert_admin on public.propostas;
drop policy if exists propostas_update_admin on public.propostas;
drop policy if exists propostas_delete_admin on public.propostas;
drop policy if exists propostas_insert_anon on public.propostas;

create policy propostas_select_mestre on public.propostas
  for select to authenticated using (public.is_mestre_ou_admin());
create policy propostas_insert_mestre on public.propostas
  for insert to authenticated with check (public.is_mestre_ou_admin());
create policy propostas_insert_anon on public.propostas
  for insert to anon with check (true);
create policy propostas_update_mestre on public.propostas
  for update to authenticated
  using (public.is_mestre_ou_admin())
  with check (public.is_mestre_ou_admin());
create policy propostas_delete_mestre on public.propostas
  for delete to authenticated using (public.is_mestre_ou_admin());

drop policy if exists proposta_anexos_select_admin on public.proposta_anexos;
drop policy if exists proposta_anexos_insert_admin on public.proposta_anexos;
drop policy if exists proposta_anexos_update_admin on public.proposta_anexos;
drop policy if exists proposta_anexos_delete_admin on public.proposta_anexos;

create policy proposta_anexos_select_mestre on public.proposta_anexos
  for select to authenticated using (public.is_mestre_ou_admin());
create policy proposta_anexos_insert_mestre on public.proposta_anexos
  for insert to authenticated with check (public.is_mestre_ou_admin());
create policy proposta_anexos_update_mestre on public.proposta_anexos
  for update to authenticated
  using (public.is_mestre_ou_admin())
  with check (public.is_mestre_ou_admin());
create policy proposta_anexos_delete_mestre on public.proposta_anexos
  for delete to authenticated using (public.is_mestre_ou_admin());

drop policy if exists admin_proposta_escopos_select_own on public.admin_proposta_escopos;
create policy admin_proposta_escopos_select_mestre on public.admin_proposta_escopos
  for select to authenticated using (public.is_mestre_ou_admin());

drop policy if exists propostas_admin_all on storage.objects;
drop policy if exists propostas_storage_admin_select on storage.objects;
drop policy if exists propostas_storage_admin_update on storage.objects;
drop policy if exists propostas_storage_admin_delete on storage.objects;
drop policy if exists propostas_storage_public_insert on storage.objects;

create policy propostas_storage_select_mestre on storage.objects
  for select to authenticated
  using (bucket_id = 'propostas' and public.is_mestre_ou_admin());
create policy propostas_storage_update_mestre on storage.objects
  for update to authenticated
  using (bucket_id = 'propostas' and public.is_mestre_ou_admin())
  with check (bucket_id = 'propostas' and public.is_mestre_ou_admin());
create policy propostas_storage_delete_mestre on storage.objects
  for delete to authenticated
  using (bucket_id = 'propostas' and public.is_mestre_ou_admin());

-- Keep upload available to the public submission form without granting read access.
create policy propostas_storage_insert_public on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'propostas');
