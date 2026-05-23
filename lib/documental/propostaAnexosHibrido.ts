import {
  ANEXOS_URL_PROPOSTA,
  extrairAnexosProposta,
  type AnexoPropostaRef,
  type AnexoUrlPropostaKey,
} from "@/lib/documental/propostaPaths";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PropostaAnexoRow = {
  proposta_id: string;
  chave: string;
  label?: string | null;
  storage_path: string;
  status?: string | null;
};

function isAnexoUrlKey(chave: string): chave is AnexoUrlPropostaKey {
  return ANEXOS_URL_PROPOSTA.some((m) => m.key === chave);
}

/** Leitura híbrida desligada por padrão — não altera comportamento até ativar explicitamente. */
export function usePropostaAnexosTableLeitura(): boolean {
  const raw =
    process.env.USE_PROPOSTA_ANEXOS_TABLE ??
    process.env.NEXT_PUBLIC_USE_PROPOSTA_ANEXOS_TABLE;
  return raw === "true" || raw === "1";
}

export function anexoRowParaRef(row: PropostaAnexoRow): AnexoPropostaRef | null {
  const path = row.storage_path?.trim();
  if (!path || !isAnexoUrlKey(row.chave)) return null;

  const meta = ANEXOS_URL_PROPOSTA.find((m) => m.key === row.chave);
  return {
    key: row.chave,
    label: row.label?.trim() || meta?.label || row.chave,
    path,
  };
}

/** União legado + tabela; mesma chave+path não duplica (legado prevalece). */
export function mesclarAnexosLegadoETabela(
  legado: AnexoPropostaRef[],
  tabela: AnexoPropostaRef[]
): AnexoPropostaRef[] {
  const porId = (a: AnexoPropostaRef) => `${a.key}\0${a.path}`;
  const map = new Map<string, AnexoPropostaRef>();

  for (const a of legado) map.set(porId(a), a);
  for (const a of tabela) {
    const id = porId(a);
    if (!map.has(id)) map.set(id, a);
  }

  return Array.from(map.values());
}

export function resolverAnexosProposta(
  proposta: Record<string, unknown> | null | undefined,
  anexosTabela?: AnexoPropostaRef[] | null
): AnexoPropostaRef[] {
  const legado = extrairAnexosProposta(proposta);
  if (!usePropostaAnexosTableLeitura()) return legado;
  if (!anexosTabela?.length) return legado;
  return mesclarAnexosLegadoETabela(legado, anexosTabela);
}

export async function carregarAnexosTabelaPorPropostas(
  client: SupabaseClient,
  propostaIds: string[]
): Promise<Map<string, AnexoPropostaRef[]>> {
  const map = new Map<string, AnexoPropostaRef[]>();
  if (!propostaIds.length) return map;

  const { data, error } = await client
    .from("proposta_anexos")
    .select("proposta_id, chave, label, storage_path, status")
    .in("proposta_id", propostaIds)
    .eq("status", "ativo");

  if (error) throw error;

  for (const row of data || []) {
    const ref = anexoRowParaRef(row as PropostaAnexoRow);
    if (!ref) continue;
    const pid = String(row.proposta_id);
    const lista = map.get(pid) || [];
    lista.push(ref);
    map.set(pid, lista);
  }

  return map;
}
