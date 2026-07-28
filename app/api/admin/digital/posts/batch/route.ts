import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";

export async function POST(req: NextRequest) {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;

  let body: { action?: string; post_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const { action, post_ids } = body;

  if (action !== "approve" && action !== "archive") {
    return NextResponse.json(
      { ok: false, error: "Ação inválida. Use: approve, archive." },
      { status: 400 }
    );
  }

  if (!Array.isArray(post_ids) || post_ids.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Selecione ao menos um post." },
      { status: 400 }
    );
  }

  if (post_ids.length > 100) {
    return NextResponse.json(
      { ok: false, error: "Máximo de 100 posts por ação em lote." },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let allowedStatuses: string[];

  if (action === "approve") {
    patch.status = "approved";
    patch.scheduled_at = null;
    allowedStatuses = ["draft"];
  } else {
    patch.status = "archived";
    allowedStatuses = ["draft", "approved", "scheduled", "published_manual"];
  }

  const { data, error } = await supabaseAdmin
    .from("digital_posts")
    .update(patch)
    .in("id", post_ids)
    .in("status", allowedStatuses)
    .select("id");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
}
