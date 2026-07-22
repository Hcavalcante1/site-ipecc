export type ProcessoOpcao = { id: string; titulo: string };

/** Lista processos ativos do escopo do admin (via API server-side com service role). */
export async function carregarProcessosDoEscopo(): Promise<ProcessoOpcao[]> {
  try {
    const res = await fetch("/api/admin/processos/opcoes", { credentials: "include" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.processos || []) as ProcessoOpcao[];
  } catch {
    return [];
  }
}
