-- =============================================================================
-- Multi-admin por processo — Fase 2 (RLS por escopo)
-- Aplicar no Supabase SQL Editor DEPOIS da fase 1.
-- Seguro reexecutar: DROP POLICY IF EXISTS / CREATE OR REPLACE.
--
-- Objetivo:
-- - Mestre (ou is_admin legado): acesso total autenticado
-- - Operador/externo: so processos do admin_escopos + flag do modulo
-- - Publico (anon): continua lendo conteudo publicavel; propostas INSERT publico
-- - APIs com service_role (mutate/governanca) ignoram RLS (inalterado)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin_mestre()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.admin_perfis p
      where p.user_id = auth.uid()
        and p.ativo = true
        and p.papel = 'mestre'
    )
    or coalesce(public.is_admin(auth.uid()), false);
$$;

create or replace function public.admin_tem_modulo_processo(
  p_processo_id uuid,
  p_modulo text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_mestre()
    or (
      p_processo_id is not null
      and exists (
        select 1
        from public.admin_escopos e
        join public.admin_perfis p on p.user_id = e.user_id
        where e.user_id = auth.uid()
          and p.ativo = true
          and e.processo_id = p_processo_id
          and case p_modulo
            when 'editais' then e.mod_editais
            when 'propostas' then e.mod_propostas
            when 'transparencia' then e.mod_transparencia
            when 'noticias' then e.mod_noticias
            when 'eventos' then e.mod_eventos
            when 'projetos' then e.mod_projetos
            when 'digital' then e.mod_digital
            else false
          end
      )
    );
$$;

grant execute on function public.is_admin_mestre() to authenticated;
grant execute on function public.admin_tem_modulo_processo(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- EDITAIIS
-- ---------------------------------------------------------------------------

alter table public.editais enable row level security;

-- Leitura publica: nao-rascunho (site /editais, /transparencia)
drop policy if exists "editais_select_publico" on public.editais;
create policy "editais_select_publico"
on public.editais for select
to anon, authenticated
using (
  coalesce(fase_atual, '') <> 'rascunho'
);

-- Admin autenticado: mestre ou escopo
drop policy if exists "editais_select_admin_escopo" on public.editais;
create policy "editais_select_admin_escopo"
on public.editais for select
to authenticated
using (
  public.is_admin_mestre()
  or public.admin_tem_modulo_processo(processo_id, 'editais')
  -- rascunho do proprio escopo (testes)
  or (
    coalesce(fase_atual, '') = 'rascunho'
    and public.admin_tem_modulo_processo(processo_id, 'editais')
  )
);

drop policy if exists "editais_write_admin_escopo" on public.editais;
create policy "editais_write_admin_escopo"
on public.editais for all
to authenticated
using (
  public.is_admin_mestre()
  or public.admin_tem_modulo_processo(processo_id, 'editais')
)
with check (
  public.is_admin_mestre()
  or public.admin_tem_modulo_processo(processo_id, 'editais')
);

-- ---------------------------------------------------------------------------
-- NOTICIAS
-- ---------------------------------------------------------------------------

alter table public.noticias enable row level security;

drop policy if exists "noticias_select_publico" on public.noticias;
create policy "noticias_select_publico"
on public.noticias for select
to anon, authenticated
using (coalesce(publicado, false) = true);

drop policy if exists "noticias_select_admin_escopo" on public.noticias;
create policy "noticias_select_admin_escopo"
on public.noticias for select
to authenticated
using (
  public.is_admin_mestre()
  or public.admin_tem_modulo_processo(processo_id, 'noticias')
);

drop policy if exists "noticias_write_admin_escopo" on public.noticias;
create policy "noticias_write_admin_escopo"
on public.noticias for all
to authenticated
using (
  public.is_admin_mestre()
  or public.admin_tem_modulo_processo(processo_id, 'noticias')
)
with check (
  public.is_admin_mestre()
  or public.admin_tem_modulo_processo(processo_id, 'noticias')
);

-- ---------------------------------------------------------------------------
-- EVENTOS
-- ---------------------------------------------------------------------------

alter table public.eventos enable row level security;

drop policy if exists "eventos_select_publico" on public.eventos;
create policy "eventos_select_publico"
on public.eventos for select
to anon, authenticated
using (coalesce(publicado, false) = true);

drop policy if exists "eventos_select_admin_escopo" on public.eventos;
create policy "eventos_select_admin_escopo"
on public.eventos for select
to authenticated
using (
  public.is_admin_mestre()
  or public.admin_tem_modulo_processo(processo_id, 'eventos')
);

drop policy if exists "eventos_write_admin_escopo" on public.eventos;
create policy "eventos_write_admin_escopo"
on public.eventos for all
to authenticated
using (
  public.is_admin_mestre()
  or public.admin_tem_modulo_processo(processo_id, 'eventos')
)
with check (
  public.is_admin_mestre()
  or public.admin_tem_modulo_processo(processo_id, 'eventos')
);

-- ---------------------------------------------------------------------------
-- DOCUMENTOS PUBLICOS (governanca)
-- ---------------------------------------------------------------------------

alter table public.documentos_publicos enable row level security;

drop policy if exists "documentos_publicos_select_publicado" on public.documentos_publicos;
create policy "documentos_publicos_select_publicado"
on public.documentos_publicos for select
to anon, authenticated
using (coalesce(publicado, false) = true);

drop policy if exists "documentos_publicos_admin_escopo" on public.documentos_publicos;
create policy "documentos_publicos_admin_escopo"
on public.documentos_publicos for all
to authenticated
using (
  public.is_admin_mestre()
  or exists (
    select 1
    from public.editais e
    where e.id = documentos_publicos.edital_id
      and public.admin_tem_modulo_processo(e.processo_id, 'editais')
  )
)
with check (
  public.is_admin_mestre()
  or exists (
    select 1
    from public.editais e
    where e.id = documentos_publicos.edital_id
      and public.admin_tem_modulo_processo(e.processo_id, 'editais')
  )
);

-- ---------------------------------------------------------------------------
-- PROPOSTAS
-- ---------------------------------------------------------------------------

alter table public.propostas enable row level security;

-- Envio publico do formulario
drop policy if exists "propostas_insert_publico" on public.propostas;
create policy "propostas_insert_publico"
on public.propostas for insert
to anon, authenticated
with check (true);

-- Admin le/atualiza conforme escopo do edital vinculado
drop policy if exists "propostas_select_admin_escopo" on public.propostas;
create policy "propostas_select_admin_escopo"
on public.propostas for select
to authenticated
using (
  public.is_admin_mestre()
  or exists (
    select 1
    from public.editais e
    where e.id = propostas.edital_id
      and public.admin_tem_modulo_processo(e.processo_id, 'propostas')
  )
);

drop policy if exists "propostas_update_admin_escopo" on public.propostas;
create policy "propostas_update_admin_escopo"
on public.propostas for update
to authenticated
using (
  public.is_admin_mestre()
  or exists (
    select 1
    from public.editais e
    where e.id = propostas.edital_id
      and public.admin_tem_modulo_processo(e.processo_id, 'propostas')
  )
)
with check (
  public.is_admin_mestre()
  or exists (
    select 1
    from public.editais e
    where e.id = propostas.edital_id
      and public.admin_tem_modulo_processo(e.processo_id, 'propostas')
  )
);

drop policy if exists "propostas_delete_admin_escopo" on public.propostas;
create policy "propostas_delete_admin_escopo"
on public.propostas for delete
to authenticated
using (
  public.is_admin_mestre()
  or exists (
    select 1
    from public.editais e
    where e.id = propostas.edital_id
      and public.admin_tem_modulo_processo(e.processo_id, 'propostas')
  )
);

-- ---------------------------------------------------------------------------
-- Notas
-- ---------------------------------------------------------------------------
-- 1) Editais em rascunho deixam de ser legiveis por anon (correto).
-- 2) Conteudo sem processo_id: so mestre escreve/ve no admin (operador precisa vincular).
-- 3) Se ja existirem policies antigas com outros nomes, revise no Dashboard > Authentication
--    Policies e remova conflitos duplicados de SELECT/ALL.
-- 4) Apos aplicar: login mestre → listar editais; logout → /editais sem rascunhos;
--    operador → so o processo do escopo.
