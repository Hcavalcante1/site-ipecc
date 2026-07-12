import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import {
  sincronizarAnexosPropostaTabela,
  usePropostaAnexosTableEscrita,
} from "@/lib/documental/propostaAnexosEscrita";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  if (!usePropostaAnexosTableEscrita()) {
    return NextResponse.json({ ok: true, skipped: true, linhas: 0 });
  }

  try {
    const body = await req.json();
    const propostaId = String(body?.propostaId || "").trim();

    if (!propostaId) {
      return NextResponse.json(
        { ok: false, error: "Identificador da proposta é obrigatório" },
        { status: 400 }
      );
    }

    const { data: proposta, error: loadError } = await supabaseAdmin
      .from("propostas")
      .select("*")
      .eq("id", propostaId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ ok: false, error: loadError.message }, { status: 500 });
    }

    if (!proposta) {
      return NextResponse.json({ ok: false, error: "Proposta não encontrada" }, { status: 404 });
    }

    const sync = await sincronizarAnexosPropostaTabela(
      supabaseAdmin,
      propostaId,
      proposta as Record<string, unknown>,
      "admin"
    );

    if (!sync.ok) {
      return NextResponse.json({ ok: false, error: sync.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, linhas: sync.linhas });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
