import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { gerarAuditoriaAnexos } from "@/lib/documental/auditoriaAnexos";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { propostaPermitidaNoModulo } from "@/lib/auth/propostaAccess";
import { isMestre } from "@/lib/auth/adminEscopo";

export async function GET() {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const { linhas, resumo } = await gerarAuditoriaAnexos(supabaseAdmin);
    const filtradas = isMestre(auth.contexto) ? linhas : (await Promise.all(linhas.map(async (linha) => await propostaPermitidaNoModulo(auth.contexto, linha.proposta_id) ? linha : null))).filter((linha): linha is NonNullable<typeof linha> => Boolean(linha));
    const orfaos = filtradas.filter((l) => !l.existe).length;
    const recorte = isMestre(auth.contexto) ? resumo : { propostas: new Set(filtradas.map((l) => l.proposta_id)).size, referencias: filtradas.length, orfaos, disponiveis: filtradas.length - orfaos };
    return NextResponse.json({ ok: true, linhas: filtradas, resumo: recorte });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
