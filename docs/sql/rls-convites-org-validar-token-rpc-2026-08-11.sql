-- =============================================================================
-- convites_org — fecha a policy aberta temporaria com uma RPC de token
-- Referencia: docs/INCIDENTE-RLS-REPOS-DIVERGENTES-2026-08-11.md
--
-- Substitui a leitura direta de convites_org por token (que exigia
-- qual=true, sem enumeracao possivel de bloquear via RLS declarativo) por
-- uma funcao SECURITY DEFINER, mesmo padrao ja usado em validar_portal_token.
-- Companheiro de codigo: site-ipecc/app/convite/[token]/page.tsx (branch
-- fix/convites-org-token-rpc-2026-08-11) trocado para chamar esta RPC via
-- supabase.rpc("validar_convite_token", { p_token: token }).
-- =============================================================================

begin;

create or replace function public.validar_convite_token(p_token text)
returns table(
  email text,
  papel text,
  expires_at timestamptz,
  aceito_em timestamptz,
  org_nome text
)
language sql
security definer
set search_path = public
as $$
  select c.email, c.papel, c.expires_at, c.aceito_em, o.nome as org_nome
  from convites_org c
  left join organizacoes o on o.id = c.org_id
  where c.token = p_token;
$$;

grant execute on function public.validar_convite_token(text) to anon, authenticated;

drop policy if exists "convites_org_select_temp_aberto" on public.convites_org;

commit;

-- Verificacao: select policyname, cmd, roles, qual from pg_policies
-- where schemaname='public' and tablename='convites_org';
-- Esperado: so service_role_all_convites.
--
-- select * from validar_convite_token('token-inexistente');
-- Esperado: 0 linhas, sem erro.
