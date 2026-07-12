import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { WorkerConfig } from "./config";

export function createDb(cfg: WorkerConfig): SupabaseClient {
  return createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function logEvent(
  db: SupabaseClient,
  row: {
    post_id?: string | null;
    target_id?: string | null;
    account_id?: string | null;
    platform?: string | null;
    event_type: string;
    severity?: string;
    message: string;
    details?: Record<string, unknown>;
  }
) {
  await db.from("digital_publish_logs").insert({
    post_id: row.post_id ?? null,
    target_id: row.target_id ?? null,
    account_id: row.account_id ?? null,
    platform: row.platform ?? null,
    event_type: row.event_type,
    severity: row.severity || "info",
    message: row.message,
    details: row.details || {},
  });
}

/** URL pública ou assinada para o Playwright baixar a mídia. */
export async function resolvePostMediaUrl(
  db: SupabaseClient,
  post: {
    media_url?: string | null;
    media_id?: string | null;
  }
): Promise<string | null> {
  const direct = post.media_url?.trim();
  if (direct && /^https?:\/\//i.test(direct)) return direct;

  if (!post.media_id) return null;

  const { data: media, error } = await db
    .from("digital_media")
    .select("storage_path, public_url, deleted_at")
    .eq("id", post.media_id)
    .maybeSingle();

  if (error || !media || media.deleted_at) return null;

  if (media.public_url && /^https?:\/\//i.test(media.public_url)) {
    return media.public_url;
  }

  if (!media.storage_path) return null;

  const { data: signed, error: signErr } = await db.storage
    .from("digital-media")
    .createSignedUrl(media.storage_path, 60 * 60);

  if (signErr || !signed?.signedUrl) return null;
  return signed.signedUrl;
}
