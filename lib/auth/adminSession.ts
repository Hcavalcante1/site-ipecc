import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type AdminSessionResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; message: string };

export async function verifyAdminSession(): Promise<AdminSessionResult> {
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
    return { ok: false, status: 401, message: "Não autorizado" };
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin", {
    user_id: user.id,
  });

  if (error || !isAdmin) {
    return { ok: false, status: 403, message: "Acesso negado" };
  }

  return { ok: true, userId: user.id };
}
