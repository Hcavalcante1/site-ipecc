import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "../config";
import { logEvent } from "../database";
import { getPublisher } from "../publishers/publisher.factory";

function retryAt(attempt: number): string | null {
  if (attempt <= 1) return new Date(Date.now() + 5 * 60 * 1000).toISOString();
  if (attempt === 2) return new Date(Date.now() + 30 * 60 * 1000).toISOString();
  if (attempt === 3) return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  return null;
}

export async function executePost(
  db: SupabaseClient,
  cfg: WorkerConfig,
  postId: string
) {
  await logEvent(db, {
    post_id: postId,
    event_type: "job_started",
    message: "Início da execução do post.",
  });

  const { data: post, error: postErr } = await db
    .from("digital_posts")
    .select(
      "id, title, body, hashtags, media_url, status, dry_run, content_variants, publish_attempts"
    )
    .eq("id", postId)
    .maybeSingle();

  if (postErr || !post) {
    await release(db, postId, "failed", "Post não encontrado no worker.");
    return;
  }

  const { data: targets } = await db
    .from("digital_post_targets")
    .select(
      "id, account_id, publish_status, attempt_count, digital_accounts ( id, platform, label, ativo, automation_enabled, automation_strategy, connection_status )"
    )
    .eq("post_id", postId);

  const list = targets || [];
  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const t of list) {
    const accRaw = t.digital_accounts as unknown;
    const acc = Array.isArray(accRaw) ? accRaw[0] : accRaw;
    if (!acc || !acc.ativo) {
      skipped++;
      continue;
    }
    if (t.publish_status === "published") {
      published++;
      continue;
    }
    if (
      t.publish_status === "cancelled" ||
      t.publish_status === "skipped"
    ) {
      skipped++;
      continue;
    }

    if (!acc.automation_enabled && acc.automation_strategy !== "manual") {
      // ainda assim só publica browser/api se automation_enabled
    }
    const strategy = String(acc.automation_strategy || "manual");
    if (strategy === "manual") {
      await db
        .from("digital_post_targets")
        .update({ publish_status: "skipped", publish_error: "Estratégia manual." })
        .eq("post_id", postId)
        .eq("account_id", t.account_id);
      skipped++;
      continue;
    }

    if (strategy === "browser" && !acc.automation_enabled) {
      await db
        .from("digital_post_targets")
        .update({
          publish_status: "skipped",
          publish_error: "Automação desativada na conta.",
        })
        .eq("post_id", postId)
        .eq("account_id", t.account_id);
      skipped++;
      continue;
    }

    const dryRun = Boolean(post.dry_run) || cfg.dryRun;
    const publisher = getPublisher({
      dryRun,
      strategy,
      platform: String(acc.platform),
      accountId: t.account_id,
    });

    const attempt = Number(t.attempt_count || 0) + 1;
    await db
      .from("digital_post_targets")
      .update({
        publish_status: "processing",
        publish_started_at: new Date().toISOString(),
        publish_strategy: strategy,
        attempt_count: attempt,
      })
      .eq("post_id", postId)
      .eq("account_id", t.account_id);

    await logEvent(db, {
      post_id: postId,
      account_id: t.account_id,
      platform: acc.platform,
      event_type: dryRun ? "publish_dry_run" : "publish_started",
      message: `Publicando ${acc.platform} (${strategy})`,
    });

    const caption = [post.body, post.hashtags].filter(Boolean).join("\n\n");
    const result = await publisher.publish({
      postId,
      targetId: (t.id as string) || null,
      accountId: t.account_id,
      platform: String(acc.platform),
      caption,
      mediaUrl: post.media_url,
      dryRun,
    });

    if (result.success) {
      published++;
      await db
        .from("digital_post_targets")
        .update({
          publish_status: "published",
          published_at: new Date().toISOString(),
          external_post_id: result.externalPostId || null,
          external_post_url: result.externalPostUrl || null,
          publish_error: null,
          error_code: null,
          evidence_path: result.evidencePath || null,
          publisher_response: result.rawResponse || {},
        })
        .eq("post_id", postId)
        .eq("account_id", t.account_id);

      await logEvent(db, {
        post_id: postId,
        account_id: t.account_id,
        platform: acc.platform,
        event_type: "publish_success",
        message: dryRun
          ? "Simulação OK (dry-run)."
          : "Publicação confirmada.",
        details: {
          url: result.externalPostUrl,
          id: result.externalPostId,
        },
      });
    } else {
      failed++;
      const reconnect = Boolean(result.requiresReconnect);
      const status = reconnect ? "reconnect_required" : "failed";
      const next =
        reconnect || attempt >= cfg.maxAttempts
          ? null
          : retryAt(attempt);

      await db
        .from("digital_post_targets")
        .update({
          publish_status: status,
          publish_error: result.errorMessage || "Falha na publicação",
          error_code: result.errorCode || null,
          next_attempt_at: next,
          publisher_response: result.rawResponse || {},
        })
        .eq("post_id", postId)
        .eq("account_id", t.account_id);

      if (reconnect) {
        await db
          .from("digital_accounts")
          .update({
            requires_reconnect: true,
            connection_status: "expired",
            last_connection_error: result.errorMessage || null,
          })
          .eq("id", t.account_id);
      }

      await logEvent(db, {
        post_id: postId,
        account_id: t.account_id,
        platform: acc.platform,
        event_type: "publish_failed",
        severity: "error",
        message: result.errorMessage || "Falha",
        details: { code: result.errorCode, next_attempt_at: next },
      });
    }
  }

  let automation_status: string = "published";
  if (failed > 0 && published > 0) automation_status = "partially_published";
  else if (failed > 0 && published === 0) automation_status = "failed";
  else if (published === 0 && skipped >= list.length)
    automation_status = "cancelled";

  const attempts = Number(post.publish_attempts || 0) + 1;
  await db
    .from("digital_posts")
    .update({
      automation_status,
      publish_attempts: attempts,
      published_at:
        automation_status === "published"
          ? new Date().toISOString()
          : undefined,
      last_publish_error:
        failed > 0 ? `${failed} destino(s) com falha` : null,
      locked_at: null,
      locked_by: null,
      lock_expires_at: null,
      updated_at: new Date().toISOString(),
      ...(automation_status === "published"
        ? { status: "published_manual", published_via: cfg.dryRun ? "manual" : "browser" }
        : {}),
    })
    .eq("id", postId);

  await logEvent(db, {
    post_id: postId,
    event_type: "job_finished",
    message: `Fim: ${automation_status}`,
    details: { published, failed, skipped },
  });
}

async function release(
  db: SupabaseClient,
  postId: string,
  automation_status: string,
  error: string
) {
  await db
    .from("digital_posts")
    .update({
      automation_status,
      last_publish_error: error,
      locked_at: null,
      locked_by: null,
      lock_expires_at: null,
    })
    .eq("id", postId);
}
