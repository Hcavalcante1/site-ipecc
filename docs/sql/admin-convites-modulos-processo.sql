-- Extende o convite existente para conceder módulos escolhidos por processo.
-- Aplicar antes de publicar o novo formulário em Admin > Acessos.

alter table public.admin_convites_propostas
  alter column proposta_id drop not null,
  add column if not exists mod_editais boolean not null default false,
  add column if not exists mod_transparencia boolean not null default false,
  add column if not exists mod_noticias boolean not null default false,
  add column if not exists mod_eventos boolean not null default false,
  add column if not exists mod_projetos boolean not null default false,
  add column if not exists mod_digital boolean not null default false,
  add column if not exists mod_documentos boolean not null default false,
  add column if not exists escopo_id uuid references public.admin_escopos(id) on delete set null;

alter table public.admin_escopos
  add column if not exists mod_digital boolean not null default false,
  add column if not exists mod_documentos boolean not null default false;

alter table public.admin_convites_propostas
  alter column mod_propostas set default false;

create index if not exists idx_admin_convites_modulos_processo_email
  on public.admin_convites_propostas(processo_id, lower(email))
  where proposta_id is null;

-- Aceitação e criação do escopo ocorrem numa transação única; bloqueia aceite duplo.
create or replace function public.aceitar_convite_admin_modulos(
  p_invite_id uuid,
  p_user_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  convite public.admin_convites_propostas%rowtype;
  novo_escopo_id uuid;
begin
  select * into convite
  from public.admin_convites_propostas
  where id = p_invite_id and proposta_id is null
  for update;

  if not found then raise exception 'convite_invalido'; end if;
  if convite.aceito_em is not null then raise exception 'convite_ja_aceito'; end if;
  if convite.expires_at <= now() then raise exception 'convite_expirado'; end if;
  if lower(convite.email) <> lower(coalesce(p_email, '')) then raise exception 'email_nao_corresponde'; end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id and lower(u.email) = lower(convite.email)
  ) then raise exception 'email_nao_corresponde'; end if;
  if not exists (
    select 1 from public.admin_perfis p
    where p.user_id = p_user_id and p.ativo = true
  ) then raise exception 'perfil_inativo'; end if;
  if not (convite.mod_editais or convite.mod_propostas or convite.mod_transparencia
      or convite.mod_noticias or convite.mod_eventos or convite.mod_projetos
      or convite.mod_digital or convite.mod_documentos) then
    raise exception 'modulos_invalidos';
  end if;

  insert into public.admin_escopos (
    user_id, processo_id, mod_editais, mod_propostas, mod_transparencia,
    mod_noticias, mod_eventos, mod_projetos, mod_digital, mod_documentos
  ) values (
    p_user_id, convite.processo_id, convite.mod_editais, convite.mod_propostas,
    convite.mod_transparencia, convite.mod_noticias, convite.mod_eventos,
    convite.mod_projetos, convite.mod_digital, convite.mod_documentos
  ) returning id into novo_escopo_id;

  update public.admin_convites_propostas
  set aceito_em = now(), escopo_id = novo_escopo_id
  where id = convite.id;

  return novo_escopo_id;
end;
$$;

revoke all on function public.aceitar_convite_admin_modulos(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.aceitar_convite_admin_modulos(uuid, uuid, text) to service_role;
