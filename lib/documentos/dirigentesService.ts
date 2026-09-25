import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type DirigenteAssinatura = {
  id: string;
  user_id: string | null;
  email: string | null;
  nome: string;
  cargo: string;
  role_code: string | null;
  admin_mestre?: boolean;
};

function tabelaAusente(message?: string, code?: string) {
  return (
    code === "42P01" ||
    /relation .* does not exist|could not find the table/i.test(message || "")
  );
}

function normalizarEmail(email?: string | null): string {
  return String(email || "").trim().toLowerCase();
}

function slugCargo(cargo: string): string {
  return cargo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function buscarAdminMestre(opts: {
  userId: string;
  email?: string | null;
}): Promise<DirigenteAssinatura | null> {
  const admin = getSupabaseAdmin();
  const email = normalizarEmail(opts.email);

  const perfilQuery = admin
    .from("admin_perfis")
    .select("user_id, email, papel, ativo")
    .eq("ativo", true)
    .eq("papel", "mestre")
    .limit(1);

  const { data: perfis, error } = await (email
    ? perfilQuery.or(`user_id.eq.${opts.userId},email.eq.${email}`)
    : perfilQuery.eq("user_id", opts.userId));

  const perfil = perfis?.[0];
  if (!error && perfil) {
    const perfilEmail = normalizarEmail(perfil.email) || email || null;
    return {
      id: `admin-mestre:${opts.userId}`,
      user_id: opts.userId,
      email: perfilEmail,
      nome: perfilEmail || email || "Administrador mestre",
      cargo: "Administrador mestre",
      role_code: "admin_mestre",
      admin_mestre: true,
    };
  }

  const { data: legadoIsAdmin } = await admin.rpc("is_admin", {
    user_id: opts.userId,
  });
  if (legadoIsAdmin) {
    return {
      id: `admin-mestre:${opts.userId}`,
      user_id: opts.userId,
      email: email || null,
      nome: email || "Administrador mestre",
      cargo: "Administrador mestre",
      role_code: "admin_mestre",
      admin_mestre: true,
    };
  }

  return null;
}

export async function buscarDirigenteAtivoParaAssinatura(opts: {
  userId: string;
  email?: string | null;
  processoId?: string | null;
}): Promise<
  | { ok: true; dirigente: DirigenteAssinatura }
  | { ok: false; error: string; status?: number; missingTable?: boolean }
> {
  const admin = getSupabaseAdmin();
  const email = normalizarEmail(opts.email);
  const today = new Date().toISOString().slice(0, 10);

  const adminMestre = await buscarAdminMestre({
    userId: opts.userId,
    email,
  });
  if (adminMestre) {
    return { ok: true, dirigente: adminMestre };
  }

  const matchParts = [`user_id.eq.${opts.userId}`];
  if (email) matchParts.push(`email.eq.${email}`);

  const { data, error } = await admin
    .from("org_dirigentes")
    .select(
      "id, user_id, email, nome, cargo, role_code, processo_id, ativo, inicio_mandato, fim_mandato, created_at"
    )
    .eq("ativo", true)
    .or(matchParts.join(","))
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (tabelaAusente(error.message, error.code)) {
      return {
        ok: false,
        missingTable: true,
        status: 503,
        error:
          "Tabela de dirigentes ausente. Aplique docs/sql/gestao-documental-dirigentes-assinatura.sql e cadastre a diretoria autorizada.",
      };
    }
    return { ok: false, status: 500, error: error.message };
  }

  const dirigente = (data || []).find((row) => {
    const processoOk =
      !row.processo_id ||
      !opts.processoId ||
      String(row.processo_id) === String(opts.processoId);
    const inicioOk = !row.inicio_mandato || String(row.inicio_mandato) <= today;
    const fimOk = !row.fim_mandato || String(row.fim_mandato) >= today;
    return processoOk && inicioOk && fimOk;
  });

  if (!dirigente) {
    return {
      ok: false,
      status: 403,
      error:
        "Assinatura bloqueada: somente dirigentes ativos cadastrados podem assinar documentos no admin.",
    };
  }

  return {
    ok: true,
    dirigente: {
      id: dirigente.id,
      user_id: dirigente.user_id || null,
      email: normalizarEmail(dirigente.email) || null,
      nome: String(dirigente.nome || "").trim(),
      cargo: String(dirigente.cargo || "").trim(),
      role_code:
        String(dirigente.role_code || "").trim() ||
        slugCargo(String(dirigente.cargo || "")),
    },
  };
}
