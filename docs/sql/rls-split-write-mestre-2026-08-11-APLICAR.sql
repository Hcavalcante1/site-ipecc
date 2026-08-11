-- =============================================================================
-- RLS — remove overlap de SELECT redundante em admin_escopos/admin_perfis/
-- processos_contratacao (multi-admin Fase 1)
-- Referencia: docs/DIAGNOSTICO-VALIDACAO-PLATAFORMA-2026-08-11.md (secao 4)
--
-- Contexto: docs/sql/multi-admin-processos-fase-1.sql criou, para cada uma
-- dessas 3 tabelas, uma policy "*_write_mestre"/"processos_write_mestre"
-- FOR ALL (cobre SELECT/INSERT/UPDATE/DELETE) com a condicao
-- "mestre ativo OR is_admin()". O advisor aponta isso como
-- "multiple_permissive_policies" porque ha OUTRA policy de SELECT na mesma
-- tabela que ja cobre esse mesmo publico:
--
-- - admin_escopos_select_own_or_mestre = (dono da linha) OR (mestre) OR
--   (is_admin) -- estritamente mais permissiva que a condicao de
--   admin_escopos_write_mestre (que e so "mestre OR is_admin"). Logo o
--   SELECT de write_mestre nunca adiciona visibilidade nenhuma.
-- - admin_perfis_select_own_or_mestre: mesma relacao com
--   admin_perfis_write_mestre.
-- - processos_select_admin usa is_admin_ou_perfil(uid), que retorna true
--   para QUALQUER linha ativa em admin_perfis (independente do papel) OU
--   is_admin(). Ser "mestre" implica ter uma linha ativa em admin_perfis,
--   entao a condicao de processos_write_mestre ("mestre OR is_admin") e
--   subconjunto estrito de is_admin_ou_perfil(). Logo o SELECT de
--   write_mestre tambem nunca adiciona visibilidade aqui.
--
-- Prova verificada linha a linha contra o texto original de
-- docs/sql/multi-admin-processos-fase-1.sql antes de aplicar.
--
-- Fix: cada "*_write_mestre" (FOR ALL) vira 3 policies (INSERT/UPDATE/
-- DELETE), mesma condicao de using/with_check, sem a parte de SELECT --
-- que ja e coberta pela outra policy. Zero mudanca de acesso observavel;
-- so reduz o numero de policies avaliadas em SELECT.
--
-- NAO relacionado a Fase 2 (docs/MULTI-ADMIN-FASE-2-RLS.md): essa fase e um
-- adiamento proposital ("nao precisa ir ao ar agora") que cobre
-- editais/noticias/eventos/documentos_publicos/propostas -- nao toca em
-- admin_escopos/admin_perfis/processos_contratacao.
-- =============================================================================

begin;

drop policy if exists "admin_escopos_write_mestre" on public.admin_escopos;

create policy "admin_escopos_insert_mestre"
on public.admin_escopos for insert to authenticated
with check (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
);

create policy "admin_escopos_update_mestre"
on public.admin_escopos for update to authenticated
using (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
)
with check (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
);

create policy "admin_escopos_delete_mestre"
on public.admin_escopos for delete to authenticated
using (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
);

drop policy if exists "admin_perfis_write_mestre" on public.admin_perfis;

create policy "admin_perfis_insert_mestre"
on public.admin_perfis for insert to authenticated
with check (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
);

create policy "admin_perfis_update_mestre"
on public.admin_perfis for update to authenticated
using (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
)
with check (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
);

create policy "admin_perfis_delete_mestre"
on public.admin_perfis for delete to authenticated
using (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
);

drop policy if exists "processos_write_mestre" on public.processos_contratacao;

create policy "processos_insert_mestre"
on public.processos_contratacao for insert to authenticated
with check (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
);

create policy "processos_update_mestre"
on public.processos_contratacao for update to authenticated
using (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
)
with check (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
);

create policy "processos_delete_mestre"
on public.processos_contratacao for delete to authenticated
using (
  exists (select 1 from admin_perfis p where p.user_id = auth.uid() and p.ativo and p.papel = 'mestre')
  or coalesce(is_admin(auth.uid()), false)
);

commit;

-- ---------------------------------------------------------------------------
-- Verificacao pos-aplicacao (rodar manualmente)
-- ---------------------------------------------------------------------------
-- select tablename, cmd, roles, count(*)
-- from pg_policies
-- where schemaname='public'
--   and tablename in ('admin_escopos','admin_perfis','processos_contratacao')
-- group by tablename, cmd, roles order by tablename, cmd;
-- Esperado: admin_escopos e admin_perfis com 1 policy de SELECT;
-- processos_contratacao com 2 (processos_select_admin + processos_select_escopo,
-- que sao genuinamente distintas e devem continuar separadas).
