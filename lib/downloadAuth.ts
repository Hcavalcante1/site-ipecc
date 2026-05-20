import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const BUCKETS_ADMIN_ONLY = new Set(["propostas"]);

export async function assertDownloadAllowed(
  bucket: string
): Promise<Response | null> {
  if (!BUCKETS_ADMIN_ONLY.has(bucket)) return null;

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response("Não autorizado", { status: 401 });
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin", {
    user_id: user.id,
  });

  if (error || !isAdmin) {
    return new Response("Acesso negado", { status: 403 });
  }

  return null;
}
