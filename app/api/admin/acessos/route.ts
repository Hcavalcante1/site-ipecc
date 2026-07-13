import { NextResponse } from "next/server";
import { requireMestreSession } from "@/lib/auth/adminSession";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AdminPapel } from "@/lib/auth/adminEscopo";

const SELECT_COM_TUDO =
  "id, user_id, processo_id, modalidade, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos, mod_digital, mod_documentos";
const SELECT_COM_DIGITAL =
  "id, user_id, processo_id, modalidade, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos, mod_digital";
const SELECT_BASE =
  "id, user_id, processo_id, modalidade, mod_editais, mod_propostas, mod_transparencia, mod_noticias, mod_eventos, mod_projetos";

export async function GET() {
  const auth = await requireMestreSession();
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const admin = getSupabaseAdmin();

    const [{ data: perfis, error: e1 }, escoposRes, { data: processos, error: e3 }] =
      await Promise.all([
        admin
          .from("admin_perfis")
          .select("user_id, email, papel, ativo, created_at")
          .order("created_at", { ascending: false }),
        admin.from("admin_escopos").select(SELECT_COM_TUDO),
        admin
          .from("processos_contratacao")
          .select("id, titulo, tipo, status")
          .order("titulo"),
      ]);

    let escopos = escoposRes.data;
    let e2 = escoposRes.error;
    const avisos: string[] = [];

    if (
      e2 &&
      /mod_documentos|column .* does not exist/i.test(e2.message || "")
    ) {
      const mid = await admin.from("admin_escopos").select(SELECT_COM_DIGITAL);
      escopos = (mid.data || []).map((e) => ({
        ...e,
        mod_documentos: false,
      }));
      e2 = mid.error;
      avisos.push(
        "Coluna mod_documentos ausente. Aplique docs/sql/admin-escopos-mod-documentos.sql no Supabase para liberar o checkbox Documentos."
      );
    }

    if (
      e2 &&
      /mod_digital|column .* does not exist/i.test(e2.message || "")
    ) {
      const fallback = await admin.from("admin_escopos").select(SELECT_BASE);
      escopos = (fallback.data || []).map((e) => ({
        ...e,
        mod_digital: false,
        mod_documentos: false,
      }));
      e2 = fallback.error;
      avisos.push(
        "Coluna mod_digital ausente. Aplique docs/sql/admin-escopos-mod-digital.sql no Supabase para liberar o checkbox Digital."
      );
    }

    if (e1 || e2 || e3) {
      const raw = e1?.message || e2?.message || e3?.message || "";
      return NextResponse.json(
        {
          error: raw || "Erro ao carregar acessos. Aplique o SQL da Fase 1.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      perfis: perfis || [],
      escopos: escopos || [],
      processos: processos || [],
      ...(avisos.length ? { aviso: avisos.join(" ") } : {}),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao carregar acessos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireMestreSession();
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = (await req.json()) as {
      acao?: string;
      email?: string;
      papel?: AdminPapel;
      user_id?: string;
      processo_id?: string;
      modalidade?: string | null;
      modulos?: {
        editais?: boolean;
        propostas?: boolean;
        transparencia?: boolean;
        noticias?: boolean;
        eventos?: boolean;
        projetos?: boolean;
        digital?: boolean;
        documentos?: boolean;
      };
      ativo?: boolean;
      escopo_id?: string;
    };

    const admin = getSupabaseAdmin();

    if (body.acao === "upsert_perfil") {
      const email = String(body.email || "").trim().toLowerCase();
      const papel = body.papel || "externo";
      if (!email || !["mestre", "operador", "externo"].includes(papel)) {
        return NextResponse.json(
          { error: "Informe email e papel validos." },
          { status: 400 }
        );
      }

      const { data: listed, error: listError } =
        await admin.auth.admin.listUsers({ perPage: 1000 });
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }

      const users = listed?.users ?? [];
      const user = users.find(
        (u: { id: string; email?: string | null }) =>
          (u.email || "").toLowerCase() === email
      );
      if (!user) {
        return NextResponse.json(
          {
            error:
              "Usuário não encontrado na autenticação. Crie o login no Supabase (e-mail/senha) e tente de novo.",
          },
          { status: 404 }
        );
      }

      const { error } = await admin.from("admin_perfis").upsert(
        {
          user_id: user.id,
          email: user.email ?? email,
          papel,
          ativo: body.ativo !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, user_id: user.id });
    }

    if (body.acao === "criar_escopo") {
      if (!body.user_id || !body.processo_id) {
        return NextResponse.json(
          { error: "Identificador do usuário e do processo são obrigatórios." },
          { status: 400 }
        );
      }
      const m = body.modulos || {};
      const payload: Record<string, unknown> = {
        user_id: body.user_id,
        processo_id: body.processo_id,
        modalidade: body.modalidade || null,
        mod_editais: Boolean(m.editais),
        mod_propostas: Boolean(m.propostas),
        mod_transparencia: Boolean(m.transparencia),
        mod_noticias: Boolean(m.noticias),
        mod_eventos: Boolean(m.eventos),
        mod_projetos: Boolean(m.projetos),
        mod_digital: Boolean(m.digital),
        mod_documentos: Boolean(m.documentos),
      };

      let { error } = await admin.from("admin_escopos").insert(payload);

      if (
        error &&
        /mod_documentos|column .* does not exist/i.test(error.message || "")
      ) {
        delete payload.mod_documentos;
        const retry = await admin.from("admin_escopos").insert(payload);
        error = retry.error;
        if (!error && m.documentos) {
          return NextResponse.json(
            {
              error:
                "Coluna mod_documentos ausente. Aplique docs/sql/admin-escopos-mod-documentos.sql no Supabase e tente de novo.",
            },
            { status: 500 }
          );
        }
      }

      if (error) {
        const faltaDigital =
          /mod_digital/i.test(error.message || "") ||
          /column .* does not exist/i.test(error.message || "");
        return NextResponse.json(
          {
            error: faltaDigital
              ? "Coluna mod_digital ausente. Aplique docs/sql/admin-escopos-mod-digital.sql no Supabase e tente de novo."
              : error.message,
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (body.acao === "remover_escopo") {
      if (!body.escopo_id) {
        return NextResponse.json(
          { error: "Identificador do escopo é obrigatório." },
          { status: 400 }
        );
      }
      const { error } = await admin
        .from("admin_escopos")
        .delete()
        .eq("id", body.escopo_id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (body.acao === "desativar_perfil") {
      if (!body.user_id) {
        return NextResponse.json(
          { error: "Identificador do usuário é obrigatório." },
          { status: 400 }
        );
      }
      const { error } = await admin
        .from("admin_perfis")
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq("user_id", body.user_id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao salvar acesso.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
