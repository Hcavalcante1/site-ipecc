-- Permite remover usuarios do Supabase Auth sem apagar historico associado.
-- Os registros permanecem; referencias de autoria/responsabilidade viram NULL.
-- Aplicado no projeto site-ipecc em 2026-11-08.

alter table public.admin_convites_propostas
  alter column criado_por drop not null;
alter table public.admin_convites_propostas
  drop constraint admin_convites_propostas_criado_por_fkey;
alter table public.admin_convites_propostas
  add constraint admin_convites_propostas_criado_por_fkey
  foreign key (criado_por) references auth.users(id) on delete set null;

alter table public.convites_org
  drop constraint convites_org_convidado_por_fkey;
alter table public.convites_org
  add constraint convites_org_convidado_por_fkey
  foreign key (convidado_por) references auth.users(id) on delete set null;

alter table public.ava_notas
  alter column avaliador_id drop not null;
alter table public.ava_notas
  drop constraint ava_notas_avaliador_id_fkey;
alter table public.ava_notas
  add constraint ava_notas_avaliador_id_fkey
  foreign key (avaliador_id) references public.ava_perfis(id) on delete set null;

alter table public.ava_certificados
  drop constraint ava_certificados_validado_por_fkey;
alter table public.ava_certificados
  add constraint ava_certificados_validado_por_fkey
  foreign key (validado_por) references public.ava_perfis(id) on delete set null;

alter table public.ava_entregas
  drop constraint ava_entregas_avaliada_por_fkey;
alter table public.ava_entregas
  add constraint ava_entregas_avaliada_por_fkey
  foreign key (avaliada_por) references public.ava_perfis(id) on delete set null;

alter table public.ava_frequencia
  drop constraint ava_frequencia_registrado_por_fkey;
alter table public.ava_frequencia
  add constraint ava_frequencia_registrado_por_fkey
  foreign key (registrado_por) references public.ava_perfis(id) on delete set null;

alter table public.ava_solicitacoes
  drop constraint ava_solicitacoes_respondido_por_fkey;
alter table public.ava_solicitacoes
  add constraint ava_solicitacoes_respondido_por_fkey
  foreign key (respondido_por) references public.ava_perfis(id) on delete set null;
