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
    const dry = body.dry_run === true;

    let agentOnline = false;
    const { data: agents } = await supabaseAdmin
      .from("digital_agents")
      .select("last_heartbeat_at")
      .order("last_heartbeat_at", { ascending: false })
      .limit(3);
    const now = Date.now();
    agentOnline = (agents ?? []).some((a) => {
      if (!a.last_heartbeat_at) return false;
      return now - new Date(a.last_heartbeat_at).getTime() < 90_000;
    });

    return NextResponse.json({
      ok: true,
      agent_online: agentOnline,
      message: dry
        ? "Post enfileirado em dry-run. O agente simulará a publicação."
        : agentOnline
          ? "Post enfileirado. O agente no PC deve publicar em seguida."
          : "Post na fila. O agente está offline — a publicação sai quando o computador com o agente estiver ligado.",
    });
  }

  const errMsg = "error" in result ? result.error : "Falha ao enfileirar.";
  return NextResponse.json({ ok: false, error: errMsg }, { status: 400 });
}
