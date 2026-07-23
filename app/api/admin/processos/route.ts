import { NextResponse } from "next/server";
import { requireMestreSession } from "@/lib/auth/adminSession";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TIPOS = new Set([
  "interno_ipecc",
  "publico_externo",
  "privado_externo",
]);

export async function GET() {
  const auth = await requireMestreSession();
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("processos_contratacao")
      .select("id, titulo, tipo, status, resumo, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message.includes("schema cache") || error.code === "42P01"
              ? "Tabela processos_contratacao ainda não existe. Aplique docs/sql/multi-admin-processos-fase-1.sql no Supabase."
              : error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, processos: data || [] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao carregar processos.";
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
      titulo?: string;
      tipo?: string;
      resumo?: string | null;
      id?: string;
    };

    const admin = getSupabaseAdmin();

    if (body.acao === "criar") {
      const titulo = String(body.titulo || "").trim();
      const tipo = String(body.tipo || "").trim();
      if (!titulo || !TIPOS.has(tipo)) {
        return NextResponse.json(
          { error: "Informe titulo e tipo validos." },
          { status: 400 }
        );
      }

      const { error } = await admin.from("processos_contratacao").insert({
        titulo,
        tipo,
        resumo: String(body.resumo || "").trim() || null,
        status: "ativo",
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (body.acao === "encerrar" || body.acao === "reabrir") {
      if (!body.id || !UUID_RE.test(String(body.id))) {
        return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
      }
      const novoStatus = body.acao === "encerrar" ? "encerrado" : "ativo";
      const { error } = await admin
        .from("processos_contratacao")
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq("id", body.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (body.acao === "encerrar") {
        await admin
          .from("admin_escopos")
          .delete()
          .eq("processo_id", body.id);
      }
      return NextResponse.json({ ok: true });
    }

    if (body.acao === "excluir") {
      if (!body.id || !UUID_RE.test(String(body.id))) {
        return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
      }
      await admin.from("admin_escopos").delete().eq("processo_id", body.id);
      const { error } = await admin
        .from("processos_contratacao")
        .delete()
        .eq("id", body.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao salvar processo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
