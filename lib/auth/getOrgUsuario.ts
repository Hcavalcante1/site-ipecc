import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mesmo fallback usado em lib/auth/useOrgContexto.ts quando o usuário não tem
 * linha em org_membros.
 */
export const IPECC_ORG_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export type OrgUsuario = { id: string; nome: string; slug?: string; plano?: string; logo_url?: string | null; ativo?: boolean };

/**
 * Resolve a organização do usuário autenticado (via org_membros), com
 * fallback pra org padrão do IPECC. Use isto em vez de
 * `.from("organizacoes").order("created_at").limit(1)` -- esse padrão pegava
 * sempre a organização mais antiga do banco inteiro, não a do usuário
 * (bug real corrigido em 2026-08-11, ver
 * docs/RELATORIO-COMPLETO-GAPS-OPERACIONAIS-2026-08-11.md).
 *
 * `supabase` deve ser um client com privilégio suficiente para ler
 * org_membros/organizacoes (service role ou RLS-aware autenticado).
 */
export async function getOrgDoUsuario(
  supabase: SupabaseClient,
  userId: string
): Promise<OrgUsuario | null> {
  // Select literal (nao interpolado) -- o parser de tipos do supabase-js nao
  // consegue inferir o formato de recurso aninhado `tabela(colunas)` a
  // partir de uma template string dinamica.
  const { data: membro } = await supabase
    .from("org_membros")
    .select("org_id, organizacoes(id, nome, slug, plano, logo_url, ativo)")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  const orgDoMembro = membro?.organizacoes
    ? ((Array.isArray(membro.organizacoes) ? membro.organizacoes[0] : membro.organizacoes) as OrgUsuario)
    : null;
  if (orgDoMembro) return orgDoMembro;

  const { data: orgPadrao } = await supabase
    .from("organizacoes")
    .select("id, nome, slug, plano, logo_url, ativo")
    .eq("id", IPECC_ORG_ID)
    .maybeSingle();

  return (orgPadrao as OrgUsuario | null) ?? null;
}

/** Verifica se o usuário é membro ativo (qualquer papel) da organização dada. */
export async function usuarioPertenceOrg(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("org_membros")
    .select("id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .eq("ativo", true)
    .maybeSingle();
  return !!data;
}
