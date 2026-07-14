import { createClient } from "@supabase/supabase-js";

/** Reconfirma a senha do usuário autenticado via Supabase Auth (anon). */
export async function confirmarSenhaUsuario(opts: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = String(opts.email || "")
    .trim()
    .toLowerCase();
  const password = String(opts.password || "");
  if (!email || !password) {
    return { ok: false, error: "E-mail e senha são obrigatórios." };
  }

  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anon = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) {
    return {
      ok: false,
      error: "Supabase Auth não configurado para confirmação de senha.",
    };
  }

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "Senha incorreta." };
  }

  await client.auth.signOut().catch(() => undefined);
  return { ok: true };
}
