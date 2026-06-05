-- APLICACAO MANUAL - GOVERNANCA DE EDITAIS - FASE 1
--
-- ATENCAO:
-- 1. Revisar antes de executar no Supabase.
-- 2. Executar primeiro em ambiente de staging, se disponivel.
-- 3. Nao executar se houver duvida sobre tabelas, policies ou colunas.
-- 4. Este arquivo possui COMMIT no final.
--
-- Objetivo:
-- Criar a base minima para controlar fases, documentos e logs institucionais
-- sem substituir o fluxo atual de editais, propostas e transparencia.
--
-- Principio:
-- O sistema organiza o processo; a decisao continua humana.

begin;

-- 1. Evolucao minima da tabela principal de editais.

alter table public.editais
  add column if not exists fase_atual text not null default 'rascunho',
  add column if not exists publicado_em timestamptz,
  add column if not exists recebimento_inicio timestamptz,
  add column if not exists recebimento_fim timestamptz,
  add column if not exists encerrado_em timestamptz;

alter table public.editais
  drop constraint if exists editais_fase_atual_check;

alter table public.editais
  add constraint editais_fase_atual_check
  check (
    fase_atual in (
      'rascunho',
      'publicado',
      'recebimento_propostas',
      'analise',
      'resultado_preliminar',
      'recurso',
      'julgamento_recurso',
      'resultado_final',
      'homologado',
      'adjudicado',
      'contratado',
      'execucao',
      'prestacao_contas',
      'encerrado'
    )
  );

create index if not exists idx_editais_fase_atual
  on public.editais (fase_atual);

create index if not exists idx_editais_recebimento_fim
  on public.editais (recebimento_fim);

-- 2. Vinculo formal entre propostas e editais.

alter table public.propostas
  add column if not exists edital_id uuid references public.editais(id);

create index if not exists idx_propostas_edital_id
  on public.propostas (edital_id);

-- 3. Documentos publicos oficiais do processo.

create table if not exists public.documentos_publicos (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid references public.editais(id) on delete cascade,
  tipo text not null,
  fase text,
  titulo text not null,
  descricao text,
  arquivo_url text not null,
  publicado boolean not null default true,
  publicado_em timestamptz default now(),
  created_at timestamptz not null default now()
);

alter table public.documentos_publicos
  drop constraint if exists documentos_publicos_tipo_check;

alter table public.documentos_publicos
  add constraint documentos_publicos_tipo_check
  check (
    tipo in (
      'edital',
      'anexo',
      'ata',
      'parecer',
      'recurso',
      'julgamento',
      'resultado_preliminar',
      'resultado_final',
      'homologacao',
      'adjudicacao',
      'contrato',
      'termo_parceria',
      'prestacao_de_contas',
      'encerramento'
    )
  );

create index if not exists idx_documentos_publicos_edital_id
  on public.documentos_publicos (edital_id);

create index if not exists idx_documentos_publicos_tipo
  on public.documentos_publicos (tipo);

create index if not exists idx_documentos_publicos_publicado
  on public.documentos_publicos (publicado);

-- 4. Logs institucionais do processo.

create table if not exists public.editais_logs (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid references public.editais(id) on delete cascade,
  usuario_email text,
  acao text not null,
  fase_anterior text,
  fase_nova text,
  documento_id uuid references public.documentos_publicos(id),
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_editais_logs_edital_id
  on public.editais_logs (edital_id);

create index if not exists idx_editais_logs_created_at
  on public.editais_logs (created_at desc);

-- 5. RLS inicial recomendada.
-- Leitura publica apenas de documentos publicados.
-- Mutacoes devem ocorrer pelo backend/admin com service role e sessao admin validada.

alter table public.documentos_publicos enable row level security;
alter table public.editais_logs enable row level security;

drop policy if exists "documentos_publicos_select_publicados" on public.documentos_publicos;
create policy "documentos_publicos_select_publicados"
on public.documentos_publicos
for select
using (publicado = true);

drop policy if exists "editais_logs_admin_only_no_anon" on public.editais_logs;
create policy "editais_logs_admin_only_no_anon"
on public.editais_logs
for all
using (false)
with check (false);

commit;
