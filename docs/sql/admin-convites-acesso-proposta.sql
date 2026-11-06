-- Convites de acesso restrito a uma proposta e escopos correspondentes.
-- Aplicar no Supabase depois de multi-admin-processos-fase-1.sql e
-- multi-admin-processos-fase-2-rls.sql, antes de publicar o fluxo.

create table if not exists public.admin_proposta_escopos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_perfis(user_id) on delete cascade,
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  processo_id uuid not null references public.processos_contratacao(id) on delete cascade,
  mod_propostas boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, proposta_id)
);

create index if not exists idx_admin_proposta_escopos_user
  on public.admin_proposta_escopos(user_id);
create index if not exists idx_admin_proposta_escopos_proposta
  on public.admin_proposta_escopos(proposta_id);

alter table public.admin_proposta_escopos enable row level security;
-- Leitura autenticada somente do próprio registro; escrita permanece service_role.

create table if not exists public.admin_convites_propostas (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text not null,
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  processo_id uuid not null references public.processos_contratacao(id) on delete cascade,
  mod_propostas boolean not null default true,
  criado_por uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  aceito_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_convites_propostas_email
  on public.admin_convites_propostas(lower(email));
create index if not exists idx_admin_convites_propostas_proposta
  on public.admin_convites_propostas(proposta_id);
alter table public.admin_convites_propostas enable row level security;
-- Convites também só são operados pelo service_role via APIs autenticadas.

-- Acesso direto autenticado a propostas: escopo amplo de processo OU proposta exata.
drop policy if exists "propostas_select_admin_escopo" on public.propostas;
create policy "propostas_select_admin_escopo"
on public.propostas for select to authenticated
using (
  public.is_admin_mestre()
  or exists (
    select 1 from public.editais ed
    where ed.id = propostas.edital_id
      and (
        public.admin_tem_modulo_processo(ed.processo_id, 'propostas')
        or exists (
          select 1 from public.admin_proposta_escopos a
          join public.admin_perfis p on p.user_id = a.user_id
          where a.user_id = auth.uid() and p.ativo = true
            and a.proposta_id = propostas.id and a.processo_id = ed.processo_id
            and a.mod_propostas
        )
      )
  )
);

drop policy if exists "propostas_update_admin_escopo" on public.propostas;
create policy "propostas_update_admin_escopo"
on public.propostas for update to authenticated
using (
  public.is_admin_mestre()
  or exists (
    select 1 from public.editais ed
    where ed.id = propostas.edital_id
      and (
        public.admin_tem_modulo_processo(ed.processo_id, 'propostas')
        or exists (
          select 1 from public.admin_proposta_escopos a
          join public.admin_perfis p on p.user_id = a.user_id
          where a.user_id = auth.uid() and p.ativo = true
            and a.proposta_id = propostas.id and a.processo_id = ed.processo_id
            and a.mod_propostas
        )
      )
  )
)
with check (
  public.is_admin_mestre()
  or exists (
    select 1 from public.editais ed
    where ed.id = propostas.edital_id
      and (
        public.admin_tem_modulo_processo(ed.processo_id, 'propostas')
        or exists (
          select 1 from public.admin_proposta_escopos a
          join public.admin_perfis p on p.user_id = a.user_id
          where a.user_id = auth.uid() and p.ativo = true
            and a.proposta_id = propostas.id and a.processo_id = ed.processo_id
            and a.mod_propostas
        )
      )
  )
);
-- Sessiones autenticadas podem ler apenas o próprio escopo de proposta.
drop policy if exists "admin_proposta_escopos_select_own" on public.admin_proposta_escopos;
create policy "admin_proposta_escopos_select_own"
on public.admin_proposta_escopos for select to authenticated
using (user_id = auth.uid());

-- A tela da proposta pode exibir o edital vinculado, sem abrir os demais editais.
drop policy if exists "editais_select_proposta_convidada" on public.editais;
create policy "editais_select_proposta_convidada"
on public.editais for select to authenticated
using (
  exists (
    select 1 from public.propostas pr
    join public.admin_proposta_escopos a on a.proposta_id = pr.id
    join public.admin_perfis p on p.user_id = a.user_id
    where pr.edital_id = editais.id and a.user_id = auth.uid()
      and p.ativo = true and a.processo_id = editais.processo_id and a.mod_propostas
  )
);

-- Anexos legados vinculados a proposta: leitura somente do recurso concedido.
do $$
begin
  if to_regclass('public.proposta_anexos') is not null then
    execute 'drop policy if exists "proposta_anexos_select_admin" on public.proposta_anexos';
    execute 'create policy "proposta_anexos_select_admin" on public.proposta_anexos for select to authenticated using (
      public.is_admin_mestre()
      or exists (
        select 1 from public.propostas pr
        join public.editais ed on ed.id = pr.edital_id
        where pr.id = proposta_anexos.proposta_id
          and (public.admin_tem_modulo_processo(ed.processo_id, ''propostas'')
            or exists (
              select 1 from public.admin_proposta_escopos a
              join public.admin_perfis p on p.user_id = a.user_id
              where a.user_id = auth.uid() and p.ativo = true
                and a.proposta_id = pr.id and a.processo_id = ed.processo_id and a.mod_propostas
            ))
      )
    )';
  end if;
end $$;
