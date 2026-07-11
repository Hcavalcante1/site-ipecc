import { supabase } from "@/lib/supabaseClient";

export type ProcessoOpcao = { id: string; titulo: string };

/** Lista processos ativos limitados ao escopo do admin (cliente). */
export async function carregarProcessosDoEscopo(
  processoIds: string[] | "todos"
): Promise<ProcessoOpcao[]> {
  const { data, error } = await supabase
    .from("processos_contratacao")
    .select("id, titulo")
    .eq("status", "ativo")
    .order("titulo", { ascending: true });

  if (error) return [];

  let lista = (data || []) as ProcessoOpcao[];
  if (processoIds !== "todos") {
    lista = lista.filter((p) => processoIds.includes(p.id));
  }
  return lista;
}
