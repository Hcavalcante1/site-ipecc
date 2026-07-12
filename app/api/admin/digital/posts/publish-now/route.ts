import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";
import { enqueuePostForPublish } from "@/lib/digital/publishQueue";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Enfileira post aprovado/agendado para o worker (não executa Playwright aqui). */
export async function POST(req: NextRequest) {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;

  let body: { post_id?: string; dry_run?: boolean };
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

  const result = await enqueuePostForPublish(supabaseAdmin, postId, {
    immediate: true,
    dryRun: body.dry_run === true,
  });

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      message:
        "Post enfileirado. O worker publicará em seguida (não nesta requisição).",
    });
  }

  const errMsg = "error" in result ? result.error : "Falha ao enfileirar.";
  return NextResponse.json({ ok: false, error: errMsg }, { status: 400 });
}
