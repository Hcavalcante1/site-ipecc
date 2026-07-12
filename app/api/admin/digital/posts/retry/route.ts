import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";
import { retryFailedTargets } from "@/lib/digital/publishQueue";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Repete destinos com falha (ou um account_id específico). Não republica sucessos. */
export async function POST(req: NextRequest) {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;

  let body: { post_id?: string; account_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const postId = body.post_id?.trim();
  if (!postId) {
    return NextResponse.json(
      { ok: false, error: "post_id é obrigatório." },
      { status: 400 }
    );
  }

  const result = await retryFailedTargets(
    supabaseAdmin,
    postId,
    body.account_id?.trim() || undefined
  );

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      count: result.count,
      message: `${result.count} destino(s) reenfileirado(s).`,
    });
  }

  const errMsg = "error" in result ? result.error : "Falha ao repetir.";
  return NextResponse.json({ ok: false, error: errMsg }, { status: 400 });
}
