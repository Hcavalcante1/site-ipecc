-- Gestão Documental — dirigentes autorizados para assinatura interna
-- Aplicar no Supabase antes de usar "Assinar no admin".
-- Objetivo: impedir que qualquer admin assine como simples; só dirigentes ativos.

create table if not exists public.org_dirigentes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizacoes (id) on delete set null,
  processo_id uuid references public.processos_contratacao (id) on delete set null,
  user_id uuid,
  email text,
  nome text not null,
  cpf_hash text,
  cpf_last4 text,
  cargo text not null,
  role_code text,
  inicio_mandato date,
  fim_mandato date,
  ativo boolean not null default true,
  origem text not null default 'ata_posse',
  observacao text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists org_dirigentes_user_idx
  on public.org_dirigentes (user_id)
  where ativo = true;

create index if not exists org_dirigentes_email_idx
  on public.org_dirigentes (lower(email))
  where ativo = true and email is not null;

create index if not exists org_dirigentes_processo_idx
  on public.org_dirigentes (processo_id)
  where ativo = true;

create unique index if not exists org_dirigentes_org_processo_role_uidx
  on public.org_dirigentes (
    coalesce(org_id::text, 'geral'),
    coalesce(processo_id::text, 'geral'),
    coalesce(role_code, lower(regexp_replace(cargo, '[^a-zA-Z0-9]+', '_', 'g')))
  )
  where ativo = true;

alter table public.org_dirigentes enable row level security;

comment on table public.org_dirigentes is
  'Dirigentes autorizados a assinar documentos internos no admin, conforme ata/mandato vigente.';

comment on column public.org_dirigentes.role_code is
  'Código estável do cargo, ex.: presidente, diretor_financeiro, diretor_administrativo.';
