-- =============================================================================
-- HOTFIX — regressao causada pela migration rls-gate-orphan-tables-2026-08-11
-- Referencia: docs/INCIDENTE-RLS-REPOS-DIVERGENTES-2026-08-11.md
--
-- Contexto do erro: a migration anterior de hoje travou organizacoes,
-- org_membros e convites_org para is_admin() apenas, com base na busca de
-- consumidores no codigo de `ipecc-whatsapp-leads` (zero resultados). Essa
-- busca estava incompleta -- o deploy real (Vercel) usa o repositorio
-- separado `Hcavalcante1/site-ipecc`, que tem uma feature completa de
-- multi-tenant (organizacoes, membros, convites, billing) construida sobre
-- essas mesmas tabelas, com acesso nao-admin legitimo:
--
-- - app/org/[slug]/page.tsx (site-ipecc): pagina PUBLICA (supabasePublic/anon),
--   le organizacoes filtrando .eq("ativo", true).
-- - lib/auth/useOrgContexto.ts (site-ipecc): qualquer usuario autenticado
--   (nao so admin) le org_membros .eq("user_id", user.id) e organizacoes
--   pra descobrir a propria organizacao.
-- - app/convite/[token]/page.tsx (site-ipecc): pagina de aceitar convite,
--   cliente de sessao, le convites_org .eq("token", token) sem exigir
--   is_admin().
--
-- Fix:
-- =============================================================================

begin;

-- ORGANIZACOES: leitura publica de orgs ativas (mesmo filtro que o codigo ja
-- usa). is_admin() (ja existente, criado hoje mais cedo) continua cobrindo
-- acesso total/escrita.
create policy "organizacoes_select_ativo"
on public.organizacoes for select to public
using (ativo = true);

-- ORG_MEMBROS: leitura da propria linha de membership (mesmo filtro que o
-- codigo ja usa). is_admin() continua cobrindo acesso total.
create policy "org_membros_select_own"
on public.org_membros for select to authenticated
using (user_id = (select auth.uid()));

-- CONVITES_ORG: reversao TEMPORARIA para qual=true (estado de antes de hoje).
-- RLS declarativo nao consegue restringir "select por token" com seguranca
-- sem o valor do token estar disponivel pro policy -- PostgREST nao expoe o
-- filtro da query pra dentro da policy. A correcao definitiva e trocar a
-- leitura direta da tabela por uma funcao SECURITY DEFINER que recebe o
-- token como parametro (mesmo padrao ja usado em validar_portal_token),
-- e isso exige mudanca de codigo em site-ipecc/app/convite/[token]/page.tsx,
-- fora do escopo desta sessao (so tenho acesso de leitura a esse repo).
--
-- TODO (site-ipecc): criar validar_convite_token(p_token text) SECURITY
-- DEFINER, trocar app/convite/[token]/page.tsx pra chamar a RPC em vez de
-- `.from("convites_org").select(...).eq("token", token)`, e so entao
-- remover esta policy aberta.
create policy "convites_org_select_temp_aberto"
on public.convites_org for select to public
using (true);

commit;

-- Verificacao: select tablename, policyname, cmd, roles, qual from pg_policies
-- where schemaname='public' and tablename in ('organizacoes','org_membros','convites_org')
-- order by tablename, cmd, policyname;
