import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL não definida");
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não definida");
}

export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "ipecc-public-anon",  // unique key avoids Multiple GoTrueClient warning
  },
});
