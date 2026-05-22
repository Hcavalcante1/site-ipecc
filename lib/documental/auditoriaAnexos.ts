import type { SupabaseClient } from "@supabase/supabase-js";
import { extrairAnexosProposta } from "@/lib/documental/propostaPaths";
import { existeArquivoProposta } from "@/lib/storage/propostasBucket";

export type LinhaAuditoriaAnexo = {
  proposta_id: string;
  nome: string;
  email: string;
  coluna_url: string;
  label: string;
  path: string;
  existe: boolean;
  resolved_path: string | null;
};

export type ResumoAuditoriaAnexos = {
  propostas: number;
  referencias: number;
  orfaos: number;
  disponiveis: number;
};

export async function gerarAuditoriaAnexos(
  admin: SupabaseClient
): Promise<{ linhas: LinhaAuditoriaAnexo[]; resumo: ResumoAuditoriaAnexos }> {
  const { data: propostas, error } = await admin
    .from("propostas")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) throw error;

  const linhas: LinhaAuditoriaAnexo[] = [];

  for (const proposta of propostas || []) {
    const anexos = extrairAnexosProposta(proposta as Record<string, unknown>);

    for (const anexo of anexos) {
      const check = await existeArquivoProposta(anexo.path);
      linhas.push({
        proposta_id: String(proposta.id),
        nome: String(proposta.nome || ""),
        email: String(proposta.email || ""),
        coluna_url: anexo.key,
        label: anexo.label,
        path: anexo.path,
        existe: check.exists,
        resolved_path: check.exists ? check.resolvedPath : null,
      });
    }
  }

  const orfaos = linhas.filter((l) => !l.existe).length;

  return {
    linhas,
    resumo: {
      propostas: (propostas || []).length,
      referencias: linhas.length,
      orfaos,
      disponiveis: linhas.length - orfaos,
    },
  };
}
