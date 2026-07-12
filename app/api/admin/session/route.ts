import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseRouteClient } from "@/lib/auth/supabaseRouteCookies";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  type AdminContexto,
  type AdminEscopo,
  type AdminPapel,
  isMestre,
  modulosPermitidos,
  processoIdsDoEscopo,
} from "@/lib/auth/adminEscopo";

const ADMIN_GATE_COOKIE = "ipecc_admin_gate";
const ADMIN_GATE_MAX_AGE = 300;

type PerfilRow = {
  user_id: string;
  email?: string | null;
  papel: AdminPapel;
  ativo: boolean;
};

async function contextoPorUserId(
  userId: string,
  email?: string | null
): Promise<AdminContexto | null> {
  const admin = getSupabaseAdmin();

  const { data: perfil } = await admin
    .from("admin_perfis")
    .select("user_id, email, papel, ativo")
    .eq("user_id", userId)
    .maybeSingle();

  const row = perfil as PerfilRow | null;
  const { data: isAdmin } = await admin.rpc("is_admin", { user_id: userId });

  if (row?.ativo) {
    const { data: escoposData } = await admin
      .from("admin_escopos")
      .select(
        "id, processo_id, modalidade, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos"
      )
      .eq("user_id", userId);

    return {
      userId,
      email: row.email ?? email ?? null,
      papel: row.papel,
      ativo: true,
      escopos: (escoposData || []) as AdminEscopo[],
      legadoIsAdmin: Boolean(isAdmin),
    };
  }

  if (isAdmin) {
    return {
      userId,
      email: email ?? null,
      papel: "mestre",
      ativo: true,
      escopos: [],
      legadoIsAdmin: true,
    };
  }

  return null;
}

function jsonComGate(contexto: AdminContexto) {
  const res = NextResponse.json({
    ok: true,
    papel: contexto.papel,
    legadoIsAdmin: contexto.legadoIsAdmin,
    mestre: isMestre(contexto),
    modulos: modulosPermitidos(contexto),
    processoIds: processoIdsDoEscopo(contexto),
  });
  res.cookies.set(ADMIN_GATE_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_GATE_MAX_AGE,
  });
  return res;
}

/**
 * Abre o gate admin.
 * Preferir Authorization: Bearer <access_token> (estavel apos signIn no browser).
 * Fallback: cookies SSR.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (bearer) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(bearer);

      if (error || !user) {
        return NextResponse.json(
          { error: "Sessão inválida. Faça login novamente." },
          { status: 401 }
        );
      }

      const contexto = await contextoPorUserId(user.id, user.email);
      if (!contexto) {
        return NextResponse.json(
          {
            error:
              "Acesso admin não autorizado. Falta perfil ativo em Acessos.",
          },
          { status: 403 }
        );
      }

      return jsonComGate(contexto);
    }

    // Fallback cookies
    const route = createSupabaseRouteClient();
    const {
      data: { user },
      error: userError,
    } = await route.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Não autorizado — faça login novamente." },
        { status: 401 }
      );
    }

    const contexto = await contextoPorUserId(user.id, user.email);
    if (!contexto) {
      return NextResponse.json(
        {
          error:
            "Acesso admin não autorizado. Falta perfil ativo em Acessos.",
        },
        { status: 403 }
      );
    }

    return jsonComGate(contexto);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao validar sessao admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
