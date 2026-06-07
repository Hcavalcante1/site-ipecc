import { NextResponse } from "next/server";
import { enviarPropostaPublica } from "@/lib/propostas/enviarPropostaPublica";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const resultado = await enviarPropostaPublica(body);

    if (resultado.ok === false) {
      return NextResponse.json(
        { ok: false, error: resultado.error },
        { status: resultado.status }
      );
    }

    return NextResponse.json({ ok: true, propostaId: resultado.propostaId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao enviar proposta";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
