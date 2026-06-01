"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaginaConteudoUpsert } from "./paginasConteudo";

type SaveResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

export async function upsertPaginaConteudo(
  supabase: SupabaseClient,
  row: PaginaConteudoUpsert
): Promise<SaveResult> {
  const payload = {
    ...row,
    // Mantém compatibilidade com bases onde titulo/texto não aceitam null
    // (blocos como cards/destaques/numeros salvam apenas `extra`).
    titulo: row.titulo ?? "",
    texto: row.texto ?? "",
    updated_at: new Date().toISOString(),
  };

  // Fluxo robusto no admin:
  // 1) tenta UPDATE por pagina_slug+bloco
  // 2) se não existir linha, faz INSERT
  // Evita dependência de índice único para upsert.
  const updated = await supabase
    .from("paginas_conteudo")
    .update(payload)
    .eq("pagina_slug", row.pagina_slug)
    .eq("bloco", row.bloco)
    .select("id");

  if (updated.error) {
    return { data: null, error: updated.error };
  }

  const updatedRows = Array.isArray(updated.data) ? updated.data : [];
  if (updatedRows.length > 0) {
    return { data: updated.data ?? null, error: null };
  }

  const { data, error } = await supabase.from("paginas_conteudo").insert(payload);

  return { data: data ?? null, error };
}

export async function upsertPaginaConteudoBatch(
  supabase: SupabaseClient,
  rows: PaginaConteudoUpsert[]
): Promise<SaveResult> {
  let lastData: unknown = null;

  for (const row of rows) {
    const res = await upsertPaginaConteudo(supabase, row);
    if (res.error) return res;
    lastData = res.data;
  }

  return { data: lastData, error: null };
}
