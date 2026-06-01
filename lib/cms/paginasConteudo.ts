/**

 * Leitura/gravação consistente de paginas_conteudo (admin → público).

 */



import type { SupabaseClient } from "@supabase/supabase-js";



export type PaginaConteudoRow = {

  id?: string;

  pagina_slug: string;

  bloco: string;

  titulo?: string | null;

  texto?: string | null;

  imagem_url?: string | null;

  extra?: unknown;

  created_at?: string;

  updated_at?: string;

};



export type PaginaConteudoUpsert = Omit<

  PaginaConteudoRow,

  "id" | "created_at" | "updated_at"

> & {

  titulo?: string | null;

  texto?: string | null;

  imagem_url?: string | null;

  extra?: unknown;

};



export function parsePaginaExtra<T>(value: unknown, fallback: T): T {

  if (value == null) return fallback;

  if (typeof value === "object") return value as T;

  if (typeof value === "string") {

    try {

      return JSON.parse(value) as T;

    } catch {

      return fallback;

    }

  }

  return fallback;

}



function pickLatestPaginaRow(rows: PaginaConteudoRow[]): PaginaConteudoRow {

  return [...rows].sort((a, b) => {

    const ub = Date.parse(String(b.updated_at || "")) || 0;

    const ua = Date.parse(String(a.updated_at || "")) || 0;

    if (ub !== ua) return ub - ua;

    const cb = Date.parse(String(b.created_at || "")) || 0;

    const ca = Date.parse(String(a.created_at || "")) || 0;

    return cb - ca;

  })[0];

}



export async function fetchPaginaConteudo(

  supabase: SupabaseClient,

  pagina_slug: string,

  bloco: string,

  select = "*"

): Promise<PaginaConteudoRow | null> {

  const { data, error } = await supabase

    .from("paginas_conteudo")

    .select(select)

    .eq("pagina_slug", pagina_slug)

    .eq("bloco", bloco);



  if (error) {

    console.warn(

      `[cms] fetchPaginaConteudo ${pagina_slug}/${bloco}:`,

      error.message

    );

    return null;

  }



  const rows = (data ?? []) as unknown as PaginaConteudoRow[];

  if (!rows.length) return null;

  return pickLatestPaginaRow(rows);

}



export async function fetchPaginaConteudoPorPrefixo(

  supabase: SupabaseClient,

  pagina_slug: string,

  blocoPrefix: string,

  select = "*"

): Promise<PaginaConteudoRow[]> {

  const { data, error } = await supabase

    .from("paginas_conteudo")

    .select(select)

    .eq("pagina_slug", pagina_slug)

    .like("bloco", `${blocoPrefix}%`);



  if (error) {

    console.warn(

      `[cms] fetchPaginaConteudoPorPrefixo ${pagina_slug}/${blocoPrefix}:`,

      error.message

    );

    return [];

  }



  const rows = (data ?? []) as unknown as PaginaConteudoRow[];

  const grouped = new Map<string, PaginaConteudoRow[]>();

  for (const row of rows) {

    const list = grouped.get(row.bloco) ?? [];

    list.push(row);

    grouped.set(row.bloco, list);

  }



  const out: PaginaConteudoRow[] = [];

  for (const list of grouped.values()) {

    out.push(pickLatestPaginaRow(list));

  }

  return out;

}



export async function upsertPaginaConteudoDb(

  supabase: SupabaseClient,

  row: PaginaConteudoUpsert

) {

  const payload = {

    ...row,

    updated_at: new Date().toISOString(),

  };

  const upserted = await supabase

    .from("paginas_conteudo")

    .upsert(payload, { onConflict: "pagina_slug,bloco" });

  if (!upserted.error) {

    return upserted;

  }

  const existing = await fetchPaginaConteudo(

    supabase,

    row.pagina_slug,

    row.bloco,

    "id"

  );

  if (existing?.id) {

    return supabase.from("paginas_conteudo").update(payload).eq("id", existing.id);

  }

  return supabase.from("paginas_conteudo").insert(payload);

}



export async function upsertPaginaConteudoBatchDb(

  supabase: SupabaseClient,

  rows: PaginaConteudoUpsert[]

) {

  let lastError: { message: string } | null = null;

  for (const row of rows) {

    const { error } = await upsertPaginaConteudoDb(supabase, row);

    if (error) lastError = error;

  }

  return { data: null, error: lastError };

}


