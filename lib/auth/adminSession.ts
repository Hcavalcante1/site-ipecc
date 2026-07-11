import { createSupabaseRouteClient } from "./supabaseRouteCookies";
import {
  type AdminContexto,
  type AdminEscopo,
  type AdminPapel,
  isMestre,
} from "./adminEscopo";

export type AdminSessionResult =
  | { ok: true; userId: string; contexto: AdminContexto }
  | { ok: false; status: 401 | 403; message: string };

type PerfilRow = {
  user_id: string;
  email?: string | null;
  papel: AdminPapel;
  ativo: boolean;
};

type EscopoRow = {
  id: string;
  processo_id: string | null;
  modalidade: string | null;
  mod_editais: boolean;
  mod_propostas: boolean;
  mod_transparencia: boolean;
  mod_noticias: boolean;
  mod_eventos: boolean;
  mod_projetos: boolean;
};

async function carregarContexto(
  userId: string,
  email?: string | null
): Promise<AdminContexto | null> {
  const supabase = createSupabaseRouteClient();

  const { data: perfil, error: perfilError } = await supabase
    .from("admin_perfis")
    .select("user_id, email, papel, ativo")
    .eq("user_id", userId)
    .maybeSingle();

  // Tabela ainda nao aplicada no banco → fallback legado
  if (perfilError) {
    const { data: isAdmin } = await supabase.rpc("is_admin", {
      user_id: userId,
    });
    if (!isAdmin) return null;
    return {
      userId,
      email: email ?? null,
      papel: "mestre",
      ativo: true,
      escopos: [],
      legadoIsAdmin: true,
    };
  }

  const row = perfil as PerfilRow | null;
  if (row?.ativo) {
    const { data: escoposData } = await supabase
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
      legadoIsAdmin: false,
    };
  }

  // Sem perfil ativo: tenta is_admin legado
  const { data: isAdmin } = await supabase.rpc("is_admin", {
    user_id: userId,
  });
  if (!isAdmin) return null;

  return {
    userId,
    email: email ?? null,
    papel: "mestre",
    ativo: true,
    escopos: [],
    legadoIsAdmin: true,
  };
}

export async function verifyAdminSession(): Promise<AdminSessionResult> {
  const supabase = createSupabaseRouteClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      message: "Não autorizado — faça login novamente.",
    };
  }

  // Preferencia: RPC nova (perfil OU is_admin)
  const { data: gateNovo, error: gateNovoError } = await supabase.rpc(
    "is_admin_ou_perfil",
    { p_user_id: user.id }
  );

  if (!gateNovoError && gateNovo === false) {
    return {
      ok: false,
      status: 403,
      message: "Acesso negado — usuário sem permissão admin.",
    };
  }

  if (gateNovoError) {
    // RPC ainda nao aplicada: fallback is_admin
    const { data: isAdmin, error } = await supabase.rpc("is_admin", {
      user_id: user.id,
    });
    if (error || !isAdmin) {
      return {
        ok: false,
        status: 403,
        message: "Acesso negado — usuário sem permissão admin.",
      };
    }
  }

  const contexto = await carregarContexto(user.id, user.email);
  if (!contexto) {
    return {
      ok: false,
      status: 403,
      message: "Acesso negado — usuário sem permissão admin.",
    };
  }

  return { ok: true, userId: user.id, contexto };
}

export async function requireMestreSession(): Promise<AdminSessionResult> {
  const auth = await verifyAdminSession();
  if (auth.ok === false) return auth;
  if (!isMestre(auth.contexto)) {
    return {
      ok: false,
      status: 403,
      message: "Acesso restrito ao administrador mestre.",
    };
  }
  return auth;
}
