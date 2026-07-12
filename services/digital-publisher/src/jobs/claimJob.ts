import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "../config";
import { logEvent } from "../database";

export async function recoverExpiredLocks(
  db: SupabaseClient,
  cfg: WorkerConfig
) {
  const now = new Date().toISOString();
  const { data } = await db
    .from("digital_posts")
    .update({
      locked_at: null,
      locked_by: null,
      lock_expires_at: null,
      automation_status: "queued",
    })
    .lt("lock_expires_at", now)
    .not("locked_at", "is", null)
    .select("id");

  for (const row of data || []) {
    await logEvent(db, {
      post_id: row.id,
      event_type: "lock_recovered",
      severity: "warn",
      message: "Lock expirado recuperado.",
      details: { worker_id: cfg.workerId },
    });
  }
}

export async function claimNextJob(
  db: SupabaseClient,
  cfg: WorkerConfig
): Promise<string | null> {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + cfg.lockTtlMs).toISOString();

  // Candidatos: scheduled vencidos ou queued, sem lock válido
  const { data: candidates, error } = await db
    .from("digital_posts")
    .select("id, status, automation_status, scheduled_at, locked_at, lock_expires_at")
    .in("status", ["scheduled", "approved"])
    .in("automation_status", ["queued", "pending", "failed"])
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("scheduled_at", { ascending: true })
    .limit(10);

  if (error || !candidates?.length) return null;

  for (const c of candidates) {
    const lockOk =
      !c.locked_at ||
      (c.lock_expires_at && c.lock_expires_at < now);
    if (!lockOk) continue;

    const due =
      c.automation_status === "queued" ||
      (c.status === "scheduled" &&
        c.scheduled_at &&
        c.scheduled_at <= now);
    if (!due && c.automation_status !== "queued") continue;

    const { data: claimed } = await db
      .from("digital_posts")
      .update({
        locked_at: now,
        locked_by: cfg.workerId,
        lock_expires_at: expires,
        automation_status: "processing",
        updated_at: now,
      })
      .eq("id", c.id)
      .or(`locked_at.is.null,lock_expires_at.lt.${now}`)
      .select("id")
      .maybeSingle();

    if (claimed?.id) {
      await logEvent(db, {
        post_id: claimed.id,
        event_type: "job_claimed",
        message: `Job reivindicado por ${cfg.workerId}`,
        details: { worker_id: cfg.workerId },
      });
      return claimed.id as string;
    }
  }
  return null;
}
