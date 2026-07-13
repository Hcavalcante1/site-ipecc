import { NextResponse } from "next/server";
import { denyIfSemModuloDigital } from "@/lib/digital/adminGate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Heartbeat considerado fresco (2× poll 15s + margem). */
const STALE_MS = 90_000;

export type DigitalAgentView = {
  agent_id: string;
  machine_name: string | null;
  status: string;
  online: boolean;
  last_heartbeat_at: string | null;
  meta_session_status: string;
  worker_version: string | null;
  current_job_id: string | null;
  dry_run: boolean;
  label: string;
};

function labelFor(agent: {
  online: boolean;
  status: string;
  meta_session_status: string;
}): string {
  if (!agent.online) return "Agente offline";
  if (agent.meta_session_status === "expired") return "Sessão Meta expirada";
  if (agent.meta_session_status === "reconnect_required") {
    return "Sessão Meta exige reconexão";
  }
  if (agent.status === "busy") return "Agente conectado · processando";
  if (agent.status === "error") return "Agente conectado · com erro";
  return "Agente conectado";
}

/**
 * GET — saúde do agente residente (via heartbeat no Supabase).
 * Funciona mesmo com admin na Vercel e worker no PC.
 */
export async function GET() {
  const { denied } = await denyIfSemModuloDigital();
  if (denied) return denied;

  const { data: agents, error } = await supabaseAdmin
    .from("digital_agents")
    .select(
      "agent_id, machine_name, status, last_heartbeat_at, meta_session_status, worker_version, current_job_id, dry_run"
    )
    .order("last_heartbeat_at", { ascending: false });

  if (error) {
    const missing =
      error.message.includes("digital_agents") ||
      error.code === "42P01" ||
      error.message.includes("schema cache");
    if (missing) {
      return NextResponse.json({
        ok: true,
        table_ready: false,
        aviso:
          "Tabela digital_agents ainda não existe. Aplique docs/sql/digital-agents-resident.sql (ou node scripts/aplicar-digital-agents-resident.cjs).",
        agents: [] as DigitalAgentView[],
        primary: null,
        queue_waiting: 0,
      });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }

  const now = Date.now();
  const views: DigitalAgentView[] = (agents ?? []).map((a) => {
    const hb = a.last_heartbeat_at
      ? new Date(a.last_heartbeat_at).getTime()
      : 0;
    const online = Boolean(hb && now - hb < STALE_MS);
    const base = {
      agent_id: a.agent_id,
      machine_name: a.machine_name,
      status: online ? a.status : "offline",
      online,
      last_heartbeat_at: a.last_heartbeat_at,
      meta_session_status: a.meta_session_status ?? "unknown",
      worker_version: a.worker_version,
      current_job_id: a.current_job_id,
      dry_run: Boolean(a.dry_run),
      label: "",
    };
    base.label = labelFor(base);
    return base;
  });

  const primary = views.find((v) => v.online) ?? views[0] ?? null;

  const { count: queueWaiting } = await supabaseAdmin
    .from("digital_posts")
    .select("id", { count: "exact", head: true })
    .in("status", ["approved", "scheduled"])
    .in("automation_status", ["queued", "pending", "failed"]);

  return NextResponse.json({
    ok: true,
    table_ready: true,
    agents: views,
    primary,
    queue_waiting: queueWaiting ?? 0,
  });
}
