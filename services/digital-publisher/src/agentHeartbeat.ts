import fs from "fs";
import os from "os";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "./config";

const WORKER_VERSION = "0.1.0-resident";

let currentJobId: string | null = null;
let tableMissingLogged = false;

export function setCurrentJobId(id: string | null) {
  currentJobId = id;
}

async function resolveMetaSessionStatus(
  db: SupabaseClient
): Promise<"unknown" | "ok" | "expired" | "reconnect_required" | "none"> {
  const { data, error } = await db
    .from("digital_accounts")
    .select("connection_status, automation_enabled, automation_strategy, requires_reconnect")
    .eq("automation_enabled", true)
    .eq("automation_strategy", "browser");

  if (error) return "unknown";
  if (!data?.length) return "none";

  if (data.some((a) => a.requires_reconnect || a.connection_status === "expired")) {
    return data.some((a) => a.connection_status === "expired")
      ? "expired"
      : "reconnect_required";
  }
  if (data.some((a) => a.connection_status === "connected")) return "ok";
  if (
    data.some((a) =>
      ["challenge_required", "blocked", "error"].includes(
        String(a.connection_status)
      )
    )
  ) {
    return "reconnect_required";
  }
  return "none";
}

/** Upsert heartbeat para o admin ver agente online/offline de qualquer lugar. */
export async function sendHeartbeat(
  db: SupabaseClient,
  cfg: WorkerConfig,
  opts?: { status?: "online" | "busy" | "error"; error?: string }
) {
  const meta = await resolveMetaSessionStatus(db);
  const status =
    opts?.status || (currentJobId ? "busy" : "online");

  const row = {
    agent_id: cfg.workerId,
    machine_name: os.hostname(),
    status,
    last_heartbeat_at: new Date().toISOString(),
    meta_session_status: meta,
    worker_version: WORKER_VERSION,
    current_job_id: currentJobId,
    dry_run: cfg.dryRun,
    details: {
      platform: process.platform,
      node: process.version,
      ...(opts?.error ? { last_error: opts.error } : {}),
    },
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("digital_agents").upsert(row, {
    onConflict: "agent_id",
  });

  if (error) {
    if (!tableMissingLogged) {
      tableMissingLogged = true;
      console.warn(
        "[digital-publisher] heartbeat: tabela digital_agents ausente ou sem permissão.",
        "Aplique docs/sql/digital-agents-resident.sql —",
        error.message
      );
    }
  }
}

const LOCK_NAME = "digital-agent.lock";

export function acquireProcessLock(baseDir: string): () => void {
  const lockPath = path.join(baseDir, LOCK_NAME);
  if (fs.existsSync(lockPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(lockPath, "utf8")) as {
        pid?: number;
      };
      if (prev.pid && isPidAlive(prev.pid)) {
        throw new Error(
          `Outra instância do agente já está rodando (PID ${prev.pid}). ` +
            `Feche-a ou remova ${lockPath} se for residual.`
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Outra instância")) {
        throw err;
      }
      // lock corrompido → sobrescreve
    }
  }

  fs.writeFileSync(
    lockPath,
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    "utf8"
  );

  const release = () => {
    try {
      if (fs.existsSync(lockPath)) {
        const cur = JSON.parse(fs.readFileSync(lockPath, "utf8")) as {
          pid?: number;
        };
        if (cur.pid === process.pid) fs.unlinkSync(lockPath);
      }
    } catch {
      /* ignore */
    }
  };

  process.on("exit", release);
  process.on("SIGINT", () => {
    release();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    release();
    process.exit(0);
  });

  return release;
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
