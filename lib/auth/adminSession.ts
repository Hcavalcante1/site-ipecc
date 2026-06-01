import { createSupabaseRouteClient } from "./supabaseRouteCookies";

export type AdminSessionResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; message: string };

export async function verifyAdminSession(): Promise<AdminSessionResult> {
  const supabase = createSupabaseRouteClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, message: "Não autorizado — faça login novamente." };
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin", {
    user_id: user.id,
  });

  if (error) {
    return { ok: false, status: 403, message: `Erro ao validar admin: ${error.message}` };
  }

  if (!isAdmin) {
    return { ok: false, status: 403, message: "Acesso negado — usuário sem permissão admin." };
  }

  return { ok: true, userId: user.id };
}
