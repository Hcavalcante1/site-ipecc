import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ConversationState } from "@/lib/whatsapp/types";

const ADMIN_STATES: ConversationState[] = ["handoff", "closed"];

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  const state = req.nextUrl.searchParams.get("state")?.trim();
  const handoffOnly = req.nextUrl.searchParams.get("handoff") === "1";

  let query = supabaseAdmin
    .from("whatsapp_conversations")
    .select(
      "wa_id, state, unknown_count, from_site_hint, human_assigned_to, last_message_at, updated_at"
    )
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (state) {
    query = query.eq("state", state);
  } else if (handoffOnly) {
    query = query.eq("state", "handoff");
  }

  const { data, error } = await query;

  if (error) {
    const missing =
      error.message.includes("whatsapp_conversations") ||
      error.code === "42P01";
    return NextResponse.json({
      ok: true,
      conversations: [],
      persistenciaAtiva: false,
      aviso: missing
        ? "Tabela de conversas ausente. Aplique o script SQL de WhatsApp no Supabase."
        : error.message,
    });
  }

  return NextResponse.json({
    ok: true,
    conversations: data ?? [],
    persistenciaAtiva: true,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminSession();
  if (auth.ok === false) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status }
    );
  }

  let body: {
    wa_id?: string;
    human_assigned_to?: string | null;
    state?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const waId = body.wa_id?.trim();
  if (!waId) {
    return NextResponse.json(
      { ok: false, error: "Identificador do contato (WhatsApp) é obrigatório" },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.human_assigned_to !== undefined) {
    const v = body.human_assigned_to;
    patch.human_assigned_to =
      v === null || v === "" ? null : String(v).trim().slice(0, 120);
  }

  if (body.state !== undefined) {
    if (!ADMIN_STATES.includes(body.state as ConversationState)) {
      return NextResponse.json(
        { ok: false, error: "Estado permitido: aguardando equipe, encerrada" },
        { status: 400 }
      );
    }
    patch.state = body.state;
  }

  if (Object.keys(patch).length === 1) {
    return NextResponse.json(
      { ok: false, error: "Nada para atualizar" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("whatsapp_conversations")
    .update(patch)
    .eq("wa_id", waId)
    .select(
      "wa_id, state, unknown_count, from_site_hint, human_assigned_to, last_message_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Conversa não encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, conversation: data });
}
