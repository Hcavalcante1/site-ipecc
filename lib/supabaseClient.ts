"use client";

import { createBrowserClient } from "@supabase/ssr";
import { patchSupabaseMutations } from "@/lib/admin/supabaseMutationProxy";

export {
  fetchPaginaConteudo,
  fetchPaginaConteudoPorPrefixo,
  parsePaginaExtra,
} from "./cms/paginasConteudo";
export type { PaginaConteudoRow, PaginaConteudoUpsert } from "./cms/paginasConteudo";
export {
  upsertPaginaConteudo,
  upsertPaginaConteudoBatch,
} from "./cms/paginasConteudoClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const client = patchSupabaseMutations(
  createBrowserClient(supabaseUrl, supabaseKey)
);

// 🔥 CLIENTE ORIGINAL EXPORTADO
export const supabase = client;

// 🔥 WRAPPERS COM LOG (USAR SOMENTE QUANDO PRECISAR)
export async function insertWithLog(table: string, values: any) {
  const res = await client.from(table).insert(values);

  // não bloqueia fluxo principal
  logAuto("INSERT", table, values);

  return res;
}

export async function updateWithLog(table: string, values: any) {
  const res = await client.from(table).update(values);

  logAuto("UPDATE", table, values);

  return res;
}

export async function deleteWithLog(table: string) {
  const res = await client.from(table).delete();

  logAuto("DELETE", table, null);

  return res;
}

// 🔥 LOG AUTOMÁTICO SEGURO
async function logAuto(acao: string, tabela: string, dados: any) {
  try {
    const {
      data: { user },
    } = await client.auth.getUser();

    await client.from("admin_logs").insert({
      user_email: user?.email || "desconhecido",
      acao,
      tabela,
      detalhes: dados,
    });
  } catch (e) {
    console.error("Erro no log automático:", e);
  }
}