import { NextResponse } from "next/server";
import {
  sincronizarAnexosPropostaTabela,
  usePropostaAnexosTableEscrita,
} from "@/lib/documental/propostaAnexosEscrita";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(req: Request) {
  if (!usePropostaAnexosTableEscrita()) {
    return NextResponse.json({ ok: true, skipped: true, linhas: 0 });
  }

  try {
    const body = await req.json();
    const propostaId = String(body?.propostaId || "").trim();
    const email = String(body?.email || "").trim();

    if (!propostaId || !email) {
      return NextResponse.json(
        { ok: false, error: "propostaId e email são obrigatórios" },
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

    if (normalizarEmail(String(proposta.email || "")) !== normalizarEmail(email)) {
      return NextResponse.json({ ok: false, error: "E-mail não confere" }, { status: 403 });
    }

    const sync = await sincronizarAnexosPropostaTabela(
      supabaseAdmin,
      propostaId,
      proposta as Record<string, unknown>,
      "upload_publico"
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
