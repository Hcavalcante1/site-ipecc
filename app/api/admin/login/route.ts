import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import {
  type AdminContexto,
  type AdminEscopo,
  type AdminPapel,
  isMestre,
  modulosPermitidos,
  processoIdsDoEscopo,
} from "@/lib/auth/adminEscopo";

const ADMIN_GATE_COOKIE = "ipecc_admin_gate";
const ADMIN_GATE_MAX_AGE = 60;

type PerfilRow = {
  user_id: string;
  email?: string | null;
  papel: AdminPapel;
  ativo: boolean;
};

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Login admin server-side: Auth + gate na mesma resposta HTTP.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
    };
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Informe e-mail e senha." },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const pendingCookies: PendingCookie[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              pendingCookies.push({ name, value, options });
              try {
                cookieStore.set({ name, value, ...options });
              } catch {
                /* ignore */
              }
            }
          },
        },
      }
    );

    const { data: signed, error: signError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signError || !signed.user) {
      return NextResponse.json(
        { error: "E-mail ou senha invalidos." },
        { status: 401 }
      );
    }

    const user = signed.user;

    const { data: gate, error: gateError } = await supabase.rpc(
      "is_admin_ou_perfil",
      { p_user_id: user.id }
    );

    let autorizado = !gateError && gate === true;
    if (gateError) {
      const { data: isAdmin } = await supabase.rpc("is_admin", {
        user_id: user.id,
      });
      autorizado = Boolean(isAdmin);
    }

    if (!autorizado) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Acesso admin nao autorizado. Falta perfil ativo em Acessos (admin_perfis).",
        },
        { status: 403 }
      );
    }

    const { data: perfil } = await supabase
      .from("admin_perfis")
      .select("user_id, email, papel, ativo")
      .eq("user_id", user.id)
      .maybeSingle();

    const row = perfil as PerfilRow | null;
    let contexto: AdminContexto;

    if (row?.ativo) {
      const { data: escoposData } = await supabase
        .from("admin_escopos")
        .select(
          "id, processo_id, modalidade, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos"
        )
        .eq("user_id", user.id);
      const { data: isAdmin } = await supabase.rpc("is_admin", {
        user_id: user.id,
      });
      contexto = {
        userId: user.id,
        email: row.email ?? user.email ?? null,
        papel: row.papel,
        ativo: true,
        escopos: (escoposData || []) as AdminEscopo[],
        legadoIsAdmin: Boolean(isAdmin),
      };
    } else {
      contexto = {
        userId: user.id,
        email: user.email ?? null,
        papel: "mestre",
        ativo: true,
        escopos: [],
        legadoIsAdmin: true,
      };
    }

    const res = NextResponse.json({
      ok: true,
      papel: contexto.papel,
      mestre: isMestre(contexto),
      modulos: modulosPermitidos(contexto),
      processoIds: processoIdsDoEscopo(contexto),
    });

    for (const { name, value, options } of pendingCookies) {
      res.cookies.set(name, value, options);
    }

    res.cookies.set(ADMIN_GATE_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_GATE_MAX_AGE,
    });

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao autenticar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
