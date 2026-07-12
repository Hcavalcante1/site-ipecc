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
