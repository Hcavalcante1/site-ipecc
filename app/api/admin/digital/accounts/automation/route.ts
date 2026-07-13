import { NextRequest, NextResponse } from "next/server";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";
import {
  isDigitalAutomationStrategy,
  type DigitalAutomationStrategy,
} from "@/lib/digital/automationTypes";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Atualiza estratégia/automação da conta.
 * Conectar/verificar sessão real é feito pelo worker (navegador); aqui só marca intenção.
 */
export async function POST(req: NextRequest) {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;

  let body: {
    account_id?: string;
    automation_enabled?: boolean;
    automation_strategy?: string;
    action?:
      | "enable"
      | "disable"
      | "request_connect"
      | "mark_disconnected"
      | "verify_session";
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const accountId = body.account_id?.trim();
  if (!accountId) {
    return NextResponse.json(
      { ok: false, error: "account_id é obrigatório." },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.automation_enabled === "boolean") {
    patch.automation_enabled = body.automation_enabled;
  }
  if (
    body.automation_strategy &&
    isDigitalAutomationStrategy(body.automation_strategy)
  ) {
    patch.automation_strategy = body.automation_strategy as DigitalAutomationStrategy;
  }

  const action = body.action || "enable";
  if (action === "disable") {
    patch.automation_enabled = false;
  }
  if (action === "request_connect") {
    patch.automation_strategy = patch.automation_strategy || "browser";
    patch.connection_status = "connecting";
    patch.requires_reconnect = false;
    patch.last_connection_error = null;
  }
  if (action === "mark_disconnected") {
    patch.connection_status = "disconnected";
    patch.requires_reconnect = true;
    patch.automation_enabled = false;
  }
  if (action === "enable") {
    patch.automation_enabled = true;
    if (!patch.automation_strategy) patch.automation_strategy = "browser";
  }
  if (action === "verify_session") {
    const { data: current, error: curErr } = await supabaseAdmin
      .from("digital_accounts")
      .select("id, publisher_config, automation_strategy")
      .eq("id", accountId)
      .maybeSingle();

    if (curErr) {
      return NextResponse.json({ ok: false, error: curErr.message }, { status: 500 });
    }
    if (!current) {
      return NextResponse.json({ ok: false, error: "Conta não encontrada." }, { status: 404 });
    }

    const cfg =
      current.publisher_config &&
      typeof current.publisher_config === "object" &&
      !Array.isArray(current.publisher_config)
        ? { ...(current.publisher_config as Record<string, unknown>) }
        : {};
    cfg.verify_pending = true;
    patch.publisher_config = cfg;
    patch.automation_strategy =
      patch.automation_strategy || current.automation_strategy || "browser";
    patch.last_connection_error = null;
  }

  const { data, error } = await supabaseAdmin
    .from("digital_accounts")
    .update(patch)
    .eq("id", accountId)
    .select(
      "id, platform, automation_enabled, automation_strategy, connection_status, requires_reconnect, last_connected_at, last_connection_check_at, last_connection_error"
    )
    .maybeSingle();

  if (error) {
    const missing = /automation_|column .* does not exist/i.test(error.message);
    return NextResponse.json(
      {
        ok: false,
        error: missing
          ? "Aplique docs/sql/digital-redes-automation-phase1.sql no Supabase."
          : error.message,
      },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "Conta não encontrada." }, { status: 404 });
  }

  await supabaseAdmin.from("digital_publish_logs").insert({
    account_id: accountId,
    platform: data.platform ?? null,
    event_type:
      action === "request_connect"
        ? "account_connect_requested"
        : action === "verify_session"
          ? "account_verify_requested"
          : "account_automation_updated",
    severity: "info",
    message: `Automação da conta atualizada (${action}).`,
    details: patch,
  });

  return NextResponse.json({
    ok: true,
    account: data,
    aviso:
      action === "request_connect"
        ? "Status connecting. Com o worker rodando, faça login na janela aberta (não envie senha ao IPECC). Só marca connected com cookie de sessão."
        : action === "verify_session"
          ? "Verificação enfileirada. O worker confirma cookies de sessão em alguns segundos — atualize a página."
          : undefined,
  });
}
