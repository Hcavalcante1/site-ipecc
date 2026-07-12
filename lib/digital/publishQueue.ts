/**
 * Helpers de fila/lock para publicação técnica (admin aprova/agenda; worker executa).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DigitalAutomationStatus } from "./automationTypes";

const DEFAULT_LOCK_MS = 10 * 60 * 1000;

export function computeRetryAt(attemptCount: number): Date | null {
  // 1ª: 5m, 2ª: 30m, 3ª: 2h, depois: intervenção manual
  if (attemptCount <= 0) return new Date(Date.now() + 5 * 60 * 1000);
  if (attemptCount === 1) return new Date(Date.now() + 30 * 60 * 1000);
  if (attemptCount === 2) return new Date(Date.now() + 2 * 60 * 60 * 1000);
  return null;
}

export async function enqueuePostForPublish(
  supabase: SupabaseClient,
  postId: string,
  opts?: { dryRun?: boolean; immediate?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: post, error } = await supabase
    .from("digital_posts")
    .select("id, status, scheduled_at")
    .eq("id", postId)
    .maybeSingle();

  if (error || !post) {
    return { ok: false, error: error?.message || "Post não encontrado." };
  }

  if (post.status !== "approved" && post.status !== "scheduled") {
    return {
      ok: false,
      error:
        "Só é possível enfileirar posts aprovados ou agendados.",
    };
  }

  const patch: Record<string, unknown> = {
    automation_status: "queued" satisfies DigitalAutomationStatus,
    next_attempt_at: new Date().toISOString(),
    last_publish_error: null,
    updated_at: new Date().toISOString(),
  };
  if (opts?.dryRun != null) patch.dry_run = opts.dryRun;
  if (opts?.immediate) {
    patch.status = "scheduled";
    patch.scheduled_at = new Date().toISOString();
  }

  const { error: upErr } = await supabase
    .from("digital_posts")
    .update(patch)
    .eq("id", postId);

  if (upErr) return { ok: false, error: upErr.message };

  await supabase.from("digital_post_targets").update({
    publish_status: "queued",
    next_attempt_at: new Date().toISOString(),
  }).eq("post_id", postId).in("publish_status", ["pending", "failed"]);

  await supabase.from("digital_publish_logs").insert({
    post_id: postId,
    event_type: "job_queued",
    severity: "info",
    message: opts?.immediate
      ? "Post enfileirado via Publicar agora."
      : "Post enfileirado para o worker.",
    details: { dry_run: Boolean(opts?.dryRun) },
  });

  return { ok: true };
}

export async function retryFailedTargets(
  supabase: SupabaseClient,
  postId: string,
  accountId?: string
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  let q = supabase
    .from("digital_post_targets")
    .update({
      publish_status: "queued",
      next_attempt_at: new Date().toISOString(),
      publish_error: null,
      error_code: null,
    })
    .eq("post_id", postId)
    .in("publish_status", [
      "failed",
      "reconnect_required",
      "challenge_required",
    ]);

  if (accountId) q = q.eq("account_id", accountId);

  const { data, error } = await q.select("account_id");
  if (error) return { ok: false, error: error.message };

  const count = data?.length ?? 0;
  if (count === 0) {
    return { ok: false, error: "Nenhum destino elegível para repetir." };
  }

  await supabase
    .from("digital_posts")
    .update({
      automation_status: "queued",
      next_attempt_at: new Date().toISOString(),
      last_publish_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  await supabase.from("digital_publish_logs").insert({
    post_id: postId,
    account_id: accountId || null,
    event_type: "retry_scheduled",
    severity: "info",
    message: accountId
      ? "Retentativa de um destino enfileirada."
      : "Retentativa de destinos com falha enfileirada.",
    details: { account_id: accountId || null, count },
  });

  return { ok: true, count };
}

export function lockExpiryIso(ms = DEFAULT_LOCK_MS): string {
  return new Date(Date.now() + ms).toISOString();
}
