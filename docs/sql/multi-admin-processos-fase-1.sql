-- =============================================================================
-- Multi-admin por processo — Fase 1
-- Aplicar no Supabase SQL Editor (staging, depois producao).
-- Seguro reexecutar: IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =============================================================================

-- 1) Processo (pasta de organizacao — nao e mini-site)
create table if not exists public.processos_contratacao (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'interno_ipecc'
    check (tipo in ('publico_externo', 'privado_externo', 'interno_ipecc')),
  status text not null default 'ativo'
    check (status in ('ativo', 'encerrado', 'arquivado')),
  resumo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_processos_contratacao_status
  on public.processos_contratacao (status);

-- 2) Perfis admin (mestre | operador | externo)
create table if not exists public.admin_perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  papel text not null check (papel in ('mestre', 'operador', 'externo')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_perfis_papel
  on public.admin_perfis (papel)
  where ativo = true;

-- 3) Escopos por processo / modalidade / modulos
create table if not exists public.admin_escopos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_perfis (user_id) on delete cascade,
  processo_id uuid references public.processos_contratacao (id) on delete cascade,
  modalidade text,
  mod_editais boolean not null default true,
  mod_propostas boolean not null default true,
  mod_transparencia boolean not null default true,
  mod_noticias boolean not null default false,
  mod_eventos boolean not null default false,
  mod_projetos boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_escopos_user
  on public.admin_escopos (user_id);

create index if not exists idx_admin_escopos_processo
  on public.admin_escopos (processo_id);

-- 4) Vincular conteudo ao processo (nullable = institucional / sem pasta)
alter table public.editais
  add column if not exists processo_id uuid references public.processos_contratacao (id);

alter table public.noticias
  add column if not exists processo_id uuid references public.processos_contratacao (id);

alter table public.eventos
  add column if not exists processo_id uuid references public.processos_contratacao (id);

create index if not exists idx_editais_processo_id on public.editais (processo_id);
create index if not exists idx_noticias_processo_id on public.noticias (processo_id);
create index if not exists idx_eventos_processo_id on public.eventos (processo_id);

-- 5) Helper: usuario tem perfil admin ativo?
create or replace function public.is_admin_perfil(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_perfis p
    where p.user_id = p_user_id
      and p.ativo = true
  );
$$;

-- 6) Ampliar gate: is_admin legado OU perfil ativo
-- Mantem a RPC is_admin existente; cria wrapper usado pelo app.
create or replace function public.is_admin_ou_perfil(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.admin_perfis p
    where p.user_id = p_user_id and p.ativo = true
  ) then
    return true;
  end if;

  -- fallback: RPC legada is_admin(uuid) se existir
  begin
    return coalesce(public.is_admin(p_user_id), false);
  exception
    when undefined_function then
      return false;
  end;
end;
$$;

grant execute on function public.is_admin_perfil(uuid) to authenticated;
grant execute on function public.is_admin_ou_perfil(uuid) to authenticated;

-- 7) Migrar admins atuais (quem passa em is_admin) para mestre
-- Roda best-effort; se is_admin nao existir, nao falha o script inteiro.
do $$
begin
  insert into public.admin_perfis (user_id, email, papel, ativo)
  select u.id, u.email, 'mestre', true
  from auth.users u
  where coalesce(public.is_admin(u.id), false) = true
  on conflict (user_id) do update
    set papel = excluded.papel,
        ativo = true,
        email = coalesce(excluded.email, public.admin_perfis.email),
        updated_at = now();
exception
  when undefined_function then
    raise notice 'is_admin ausente — pule a migracao automatica de mestres.';
  when others then
    raise notice 'Migracao de mestres parcial: %', sqlerrm;
end $$;

-- 8) RLS basico
alter table public.processos_contratacao enable row level security;
alter table public.admin_perfis enable row level security;
alter table public.admin_escopos enable row level security;

drop policy if exists "processos_select_admin" on public.processos_contratacao;
create policy "processos_select_admin"
on public.processos_contratacao for select to authenticated
using (public.is_admin_ou_perfil(auth.uid()));

drop policy if exists "processos_write_mestre" on public.processos_contratacao;
create policy "processos_write_mestre"
on public.processos_contratacao for all to authenticated
using (
  exists (
    select 1 from public.admin_perfis p
    where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre'
  )
  or coalesce(public.is_admin(auth.uid()), false)
)
with check (
  exists (
    select 1 from public.admin_perfis p
    where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre'
  )
  or coalesce(public.is_admin(auth.uid()), false)
);

drop policy if exists "admin_perfis_select_own_or_mestre" on public.admin_perfis;
create policy "admin_perfis_select_own_or_mestre"
on public.admin_perfis for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.admin_perfis p
    where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre'
  )
  or coalesce(public.is_admin(auth.uid()), false)
);

drop policy if exists "admin_perfis_write_mestre" on public.admin_perfis;
create policy "admin_perfis_write_mestre"
on public.admin_perfis for all to authenticated
using (
  exists (
    select 1 from public.admin_perfis p
    where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre'
  )
  or coalesce(public.is_admin(auth.uid()), false)
)
with check (
  exists (
    select 1 from public.admin_perfis p
    where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre'
  )
  or coalesce(public.is_admin(auth.uid()), false)
);

drop policy if exists "admin_escopos_select_own_or_mestre" on public.admin_escopos;
create policy "admin_escopos_select_own_or_mestre"
on public.admin_escopos for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.admin_perfis p
    where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre'
  )
  or coalesce(public.is_admin(auth.uid()), false)
);

drop policy if exists "admin_escopos_write_mestre" on public.admin_escopos;
create policy "admin_escopos_write_mestre"
on public.admin_escopos for all to authenticated
using (
  exists (
    select 1 from public.admin_perfis p
    where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre'
  )
  or coalesce(public.is_admin(auth.uid()), false)
)
with check (
  exists (
    select 1 from public.admin_perfis p
    where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre'
  )
  or coalesce(public.is_admin(auth.uid()), false)
);

-- Operador/externo: SELECT processos do seu escopo (alem da policy geral)
drop policy if exists "processos_select_escopo" on public.processos_contratacao;
create policy "processos_select_escopo"
on public.processos_contratacao for select to authenticated
using (
  exists (
    select 1 from public.admin_escopos e
    where e.user_id = auth.uid()
      and e.processo_id = processos_contratacao.id
  )
);
