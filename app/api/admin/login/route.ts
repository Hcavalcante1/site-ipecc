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
const ADMIN_GATE_MAX_AGE = 300;

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
        { error: "E-mail ou senha inválidos." },
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
            "Acesso admin não autorizado. Falta perfil ativo em Acessos (admin_perfis).",
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
      const selectComTudo =
        "id, processo_id, modalidade, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos, mod_digital, mod_documentos";
      const selectComDigital =
        "id, processo_id, modalidade, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos, mod_digital";
      const selectBase =
        "id, processo_id, modalidade, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos";

      type EscopoPartial = {
        id: string;
        processo_id: string | null;
        modalidade: string | null;
        mod_editais?: boolean;
        mod_propostas?: boolean;
        mod_transparencia?: boolean;
        mod_noticias?: boolean;
        mod_eventos?: boolean;
        mod_projetos?: boolean;
        mod_digital?: boolean;
        mod_documentos?: boolean;
      };

      let rows: EscopoPartial[] = [];
      let escoposError: { message?: string } | null = null;

      {
        const first = await supabase
          .from("admin_escopos")
          .select(selectComTudo)
          .eq("user_id", user.id);
        rows = (first.data || []) as EscopoPartial[];
        escoposError = first.error;

        if (
          escoposError &&
          /mod_documentos|column .* does not exist/i.test(
            escoposError.message || ""
          )
        ) {
          const mid = await supabase
            .from("admin_escopos")
            .select(selectComDigital)
            .eq("user_id", user.id);
          rows = ((mid.data || []) as EscopoPartial[]).map((e) => ({
            ...e,
            mod_documentos: false,
          }));
          escoposError = mid.error;
        }

        if (
          escoposError &&
          /mod_digital|column .* does not exist/i.test(
            escoposError.message || ""
          )
        ) {
          const base = await supabase
            .from("admin_escopos")
            .select(selectBase)
            .eq("user_id", user.id);
          rows = ((base.data || []) as EscopoPartial[]).map((e) => ({
            ...e,
            mod_digital: false,
            mod_documentos: false,
          }));
          escoposError = base.error;
        }
      }

      const { data: isAdmin } = await supabase.rpc("is_admin", {
        user_id: user.id,
      });
      contexto = {
        userId: user.id,
        email: row.email ?? user.email ?? null,
        papel: row.papel,
        ativo: true,
        escopos: escoposError
          ? []
          : rows.map((e) => ({
              id: e.id,
              processo_id: e.processo_id,
              modalidade: e.modalidade,
              mod_editais: Boolean(e.mod_editais),
              mod_propostas: Boolean(e.mod_propostas),
              mod_transparencia: Boolean(e.mod_transparencia),
              mod_noticias: Boolean(e.mod_noticias),
              mod_eventos: Boolean(e.mod_eventos),
              mod_projetos: Boolean(e.mod_projetos),
              mod_digital: Boolean(e.mod_digital),
              mod_documentos: Boolean(e.mod_documentos),
            })),
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
      session: signed.session
        ? {
            access_token: signed.session.access_token,
            refresh_token: signed.session.refresh_token,
            expires_at: signed.session.expires_at,
          }
        : null,
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
