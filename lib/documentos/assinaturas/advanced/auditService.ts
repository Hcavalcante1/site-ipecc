import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { chainEventHash, canonicalJson } from "../shared/crypto";
import type { AdvEventType } from "./constants";

export async function appendAdvEvent(opts: {
  transactionId: string;
  eventType: AdvEventType | string;
  actorUserId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true; eventHash: string } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  const { data: last } = await admin
    .from("gd_adv_events")
    .select("event_hash")
    .eq("transaction_id", opts.transactionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const serverTimestamp = new Date().toISOString();
  const payload = {
    actor_user_id: opts.actorUserId || null,
    event_type: opts.eventType,
    ip: opts.ip || null,
    metadata: opts.metadata || {},
    request_id: opts.requestId || null,
    server_timestamp: serverTimestamp,
    session_id: opts.sessionId || null,
    transaction_id: opts.transactionId,
    user_agent: opts.userAgent || null,
  };
  const payloadCanonical = canonicalJson(payload);
  const eventHash = chainEventHash(last?.event_hash || null, payloadCanonical);

  const { error } = await admin.from("gd_adv_events").insert({
    transaction_id: opts.transactionId,
    event_type: opts.eventType,
    actor_user_id: opts.actorUserId || null,
    server_timestamp: serverTimestamp,
    request_id: opts.requestId || null,
    session_id: opts.sessionId || null,
    ip: opts.ip || null,
    user_agent: opts.userAgent || null,
    previous_hash: last?.event_hash || null,
    event_hash: eventHash,
    metadata: opts.metadata || {},
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, eventHash };
}

export async function auditChainHash(
  transactionId: string
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("gd_adv_events")
    .select("event_hash")
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.event_hash || null;
}
