import type { SupabaseClient } from "@supabase/supabase-js";
import { extrairAnexosProposta } from "@/lib/documental/propostaPaths";

export type OrigemPropostaAnexo = "legado" | "upload_publico" | "admin";

/** Escrita dupla desligada por padrão — colunas *_url permanecem fonte primária. */
export function usePropostaAnexosTableEscrita(): boolean {
  const raw =
    process.env.USE_PROPOSTA_ANEXOS_ESCRITA ??
    process.env.NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_ESCRITA;
  return raw === "true" || raw === "1";
}

export function montarLinhasAnexosProposta(
  propostaId: string,
  proposta: Record<string, unknown>,
  origem: OrigemPropostaAnexo
) {
  return extrairAnexosProposta(proposta).map((anexo) => ({
    proposta_id: propostaId,
    chave: anexo.key,
    label: anexo.label,
    storage_path: anexo.path,
    origem,
    status: "ativo" as const,
  }));
}

export async function sincronizarAnexosPropostaTabela(
  client: SupabaseClient,
  propostaId: string,
  proposta: Record<string, unknown>,
  origem: OrigemPropostaAnexo
): Promise<{ ok: boolean; linhas: number; error?: string }> {
  const rows = montarLinhasAnexosProposta(propostaId, proposta, origem);
  if (rows.length === 0) {
    return { ok: true, linhas: 0 };
  }

  const { error } = await client.from("proposta_anexos").upsert(rows, {
    onConflict: "proposta_id,chave,storage_path",
    ignoreDuplicates: true,
  });

  if (error) {
    return { ok: false, linhas: 0, error: error.message };
  }

  return { ok: true, linhas: rows.length };
}
