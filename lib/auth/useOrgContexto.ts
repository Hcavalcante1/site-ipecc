"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type OrgContexto = {
  orgId: string | null;
  orgNome: string | null;
  orgSlug: string | null;
  orgPlano: string | null;
  loading: boolean;
};

const IPECC_ORG_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/**
 * Retorna o contexto da organização do usuário autenticado.
 * Busca via org_membros → organizacoes. Se não houver membro, assume org IPECC padrão.
 */
export function useOrgContexto(): OrgContexto {
  const [state, setState] = useState<OrgContexto>({
    orgId: null,
    orgNome: null,
    orgSlug: null,
    orgPlano: null,
    loading: true,
  });

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (ativo) setState((s) => ({ ...s, loading: false }));
        return;
      }

      // Busca org do membro
      const { data: membro } = await supabase
        .from("org_membros")
        .select("org_id, organizacoes(id, nome, slug, plano)")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (membro?.organizacoes) {
        const org = (Array.isArray(membro.organizacoes) ? membro.organizacoes[0] : membro.organizacoes) as unknown as { id: string; nome: string; slug: string; plano: string };
        if (ativo) setState({ orgId: org.id, orgNome: org.nome, orgSlug: org.slug, orgPlano: org.plano, loading: false });
        return;
      }

      // Fallback: org IPECC padrão
      const { data: orgPadrao } = await supabase
        .from("organizacoes")
        .select("id, nome, slug, plano")
        .eq("id", IPECC_ORG_ID)
        .maybeSingle();

      if (ativo) setState({
        orgId: orgPadrao?.id ?? IPECC_ORG_ID,
        orgNome: orgPadrao?.nome ?? "Instituto IPECC",
        orgSlug: orgPadrao?.slug ?? "ipecc",
        orgPlano: orgPadrao?.plano ?? "enterprise",
        loading: false,
      });
    }

    void carregar();
    return () => { ativo = false; };
  }, []);

  return state;
}
