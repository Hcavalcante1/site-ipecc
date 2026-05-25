import { createInitialContext } from "./botEngine";
import { isWhatsAppPersistenceEnabled } from "./config";
import { logWhatsApp } from "./logWhatsApp";
import type { ConversationContext, ConversationState } from "./types";

const memorySessions = new Map<string, ConversationContext>();
const processedMessageIds = new Set<string>();

function rowToContext(row: {
  wa_id: string;
  state: string;
  unknown_count: number;
  from_site_hint: boolean | null;
}): ConversationContext {
  return {
    waId: row.wa_id,
    state: row.state as ConversationState,
    unknownCount: row.unknown_count ?? 0,
    fromSiteHint: row.from_site_hint ?? undefined,
  };
}

async function loadFromSupabase(waId: string): Promise<ConversationContext | null> {
  if (!isWhatsAppPersistenceEnabled()) return null;

  try {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data, error } = await supabaseAdmin
      .from("whatsapp_conversations")
      .select("wa_id, state, unknown_count, from_site_hint")
      .eq("wa_id", waId)
      .maybeSingle();

    if (error) {
      logWhatsApp("persist_load_error", { waId, error: error.message });
      return null;
    }
    if (!data) return null;
    return rowToContext(data);
  } catch (e) {
    logWhatsApp("persist_load_exception", {
      waId,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

async function saveToSupabase(ctx: ConversationContext): Promise<void> {
  if (!isWhatsAppPersistenceEnabled()) return;

  try {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { error } = await supabaseAdmin.from("whatsapp_conversations").upsert(
      {
        wa_id: ctx.waId,
        state: ctx.state,
        unknown_count: ctx.unknownCount,
        from_site_hint: ctx.fromSiteHint ?? false,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wa_id" }
    );

    if (error) {
      logWhatsApp("persist_save_error", { waId: ctx.waId, error: error.message });
    }
  } catch (e) {
    logWhatsApp("persist_save_exception", {
      waId: ctx.waId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export async function loadConversation(
  waId: string
): Promise<ConversationContext> {
  const cached = memorySessions.get(waId);
  if (cached) return cached;

  const fromDb = await loadFromSupabase(waId);
  if (fromDb) {
    memorySessions.set(waId, fromDb);
    return fromDb;
  }

  const fresh = createInitialContext(waId);
  memorySessions.set(waId, fresh);
  return fresh;
}

export async function saveConversation(ctx: ConversationContext): Promise<void> {
  memorySessions.set(ctx.waId, ctx);
  await saveToSupabase(ctx);
}

export function isDuplicateMessage(messageId: string | undefined): boolean {
  if (!messageId) return false;
  return processedMessageIds.has(messageId);
}

export function markMessageProcessed(messageId: string | undefined): void {
  if (!messageId) return;
  processedMessageIds.add(messageId);
  if (processedMessageIds.size > 5000) {
    processedMessageIds.clear();
  }
}

export function resetConversationMemory(waId: string): void {
  memorySessions.delete(waId);
}
