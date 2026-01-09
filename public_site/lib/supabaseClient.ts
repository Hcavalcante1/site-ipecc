// public_site/lib/supabaseClient.ts
"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * ⚠️ ESTE ARQUIVO É CLIENT-SIDE APENAS
 * NÃO usar em Server Components
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase env vars are missing");
}

/**
 * Cliente singleton para uso em páginas client
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Compatibilidade com código antigo
 * (NÃO REMOVER)
 */
export function getSupabaseBrowserClient() {
  return supabase;
}
