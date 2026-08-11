-- =============================================================================
-- RLS hardening — vazamentos de SELECT por policy permissiva concorrente
-- Referencia: docs/DIAGNOSTICO-VALIDACAO-PLATAFORMA-2026-08-11.md (secao 1)
--
-- Problema: policies PERMISSIVE se combinam com OR. Em editais e
-- transparencia_editais havia, ao lado da policy com filtro correto
-- (esconder rascunho / so publicado), outra policy com qual = true para o
-- mesmo papel — a policy aberta anulava o filtro na pratica. Em editais
-- havia tambem uma policy ALL (qual=true, with_check=true) liberando
-- escrita para qualquer authenticated, nao so admin. Em convites_org a
-- policy "por token" nao tinha nenhuma comparacao de token (qual = true),
-- expondo convites de organizacao (com token) sem autenticacao — tabela
-- sem nenhum uso no codigo hoje, entao a policy so e removida.
--
-- Confirmado no codigo antes de aplicar:
-- - Todo consumo publico de editais/transparencia_editais usa o cliente
--   supabasePublic (anon puro, sem sessao) — app/editais/*, app/editais/[id],
--   components/public/ApresentacaoLanding.tsx, app/transparencia/page.tsx
--   (via supabaseServer/SSR, cai em anon quando nao ha sessao).
-- - app/admin/editais/page.tsx e app/admin/editais/[id]/page.tsx leem via
--   o cliente com sessao (@/lib/supabaseClient) — dependem de RLS
--   authenticated para ver rascunhos, por isso a policy *_select_admin.
-- - app/admin/paginas/transparencia/editais/page.tsx idem — select("*")
--   direto pelo cliente com sessao, precisa ver linhas nao publicadas.
-- - convites_org: nenhuma referencia em app/ ou lib/ (grep vazio) — tabela
--   ainda nao usada por nenhuma feature, sem motivo para SELECT publico.
--
-- Rollback: recriar as policies removidas com "qual = true" nas mesmas
-- tabelas/papeis/comandos (ver docs/DIAGNOSTICO-VALIDACAO-PLATAFORMA-2026-08-11.md
-- secao 1 para o texto exato de cada uma antes desta migration).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- EDITAIS
-- ---------------------------------------------------------------------------

-- Policies com qual = true que anulavam o filtro de rascunho/ativo de
-- "editais_anon_select" para anon e/ou authenticated.
drop policy if exists "allow select editais" on public.editais;
drop policy if exists "editais_public_select" on public.editais;
drop policy if exists "public_select_editais" on public.editais;
drop policy if exists "Public read editais" on public.editais;

-- Policy ALL (SELECT+INSERT+UPDATE+DELETE) aberta para qualquer
-- authenticated — as policies *_admin (insert/update/delete) ja existem
-- e cobrem escrita; esta policy so precisa ser substituida no SELECT.
drop policy if exists "editais_auth_all" on public.editais;

create policy "editais_select_admin"
on public.editais
for select
to authenticated
using (is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- TRANSPARENCIA_EDITAIS
-- ---------------------------------------------------------------------------

drop policy if exists "anon_select_transparencia_editais" on public.transparencia_editais;
drop policy if exists "auth_read_transparencia_editais" on public.transparencia_editais;
drop policy if exists "auth_select_transparencia_editais" on public.transparencia_editais;

-- "public_read_transparencia_editais" (anon,authenticated, publicado = true)
-- ja existente continua cobrindo leitura publica de linhas publicadas.

create policy "transparencia_editais_select_admin"
on public.transparencia_editais
for select
to authenticated
using (is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- CONVITES_ORG
-- ---------------------------------------------------------------------------

-- "por token" sem comparacao de token nenhuma (qual = true) — expunha todos
-- os convites (inclusive o token) sem autenticacao. Sem uso no codigo hoje;
-- "service_role_all_convites" continua cobrindo o acesso via backend.
drop policy if exists "anon_select_convite_by_token" on public.convites_org;

commit;

-- ---------------------------------------------------------------------------
-- Verificacao pos-aplicacao (rodar manualmente)
-- ---------------------------------------------------------------------------
-- select tablename, policyname, cmd, roles, qual
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('editais', 'transparencia_editais', 'convites_org')
-- order by tablename, cmd, policyname;
--
-- Esperado: nenhuma policy de SELECT com qual = true restando para anon em
-- editais/transparencia_editais/convites_org, e editais/transparencia_editais
-- com uma policy "*_select_admin" gated por is_admin(auth.uid()).
