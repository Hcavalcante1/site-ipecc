-- =============================================================================
-- Transparencia como modulo vendavel — ponte de ciclo (FASE 1)
-- Aplicar no SQL Editor do Supabase (staging primeiro).
-- Depende de: public.propostas, public.editais, public.processos (se existir)
-- NAO auto-publica. Apenas prepara colunas para rascunhos idempotentes.
-- =============================================================================

-- 1) Convênios: vínculo com proposta + processo
alter table public.transparencia_convenios
  add column if not exists proposta_id uuid references public.propostas(id) on delete set null;

alter table public.transparencia_convenios
  add column if not exists processo_id uuid;

create unique index if not exists uq_transparencia_convenios_proposta_id
  on public.transparencia_convenios (proposta_id)
  where proposta_id is not null;

create index if not exists idx_transparencia_convenios_processo_id
  on public.transparencia_convenios (processo_id);

-- 2) Editais CMS transparência: processo
alter table public.transparencia_editais
  add column if not exists processo_id uuid;

create index if not exists idx_transparencia_editais_processo_id
  on public.transparencia_editais (processo_id);

create index if not exists idx_transparencia_editais_edital_id
  on public.transparencia_editais (edital_id);

-- 3) Prestação: processo (redundante útil para filtro rápido)
alter table public.transparencia_prestacao_contas
  add column if not exists processo_id uuid;

create index if not exists idx_transparencia_prestacao_processo_id
  on public.transparencia_prestacao_contas (processo_id);

-- 4) Backfill processo_id a partir de editais
-- edital_id ja e uuid neste projeto — join direto (sem regex em texto)
update public.transparencia_convenios tc
set processo_id = e.processo_id
from public.editais e
where tc.processo_id is null
  and tc.edital_id is not null
  and e.id = tc.edital_id;

update public.transparencia_editais te
set processo_id = e.processo_id
from public.editais e
where te.processo_id is null
  and te.edital_id is not null
  and e.id = te.edital_id;

update public.transparencia_prestacao_contas tp
set processo_id = tc.processo_id
from public.transparencia_convenios tc
where tp.processo_id is null
  and tp.convenio_id = tc.id
  and tc.processo_id is not null;

-- Checkpoints:
-- select column_name from information_schema.columns
--   where table_name = 'transparencia_convenios' and column_name in ('proposta_id','processo_id');
