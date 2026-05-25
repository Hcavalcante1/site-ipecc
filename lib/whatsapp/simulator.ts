import { applyTurn, createInitialContext } from "./botEngine";
import type { ConversationContext, InboundMessage } from "./types";

const sessions = new Map<string, ConversationContext>();

export function getOrCreateSession(waId: string): ConversationContext {
  let ctx = sessions.get(waId);
  if (!ctx) {
    ctx = createInitialContext(waId);
    sessions.set(waId, ctx);
  }
  return ctx;
}

export function resetSession(waId: string): void {
  sessions.delete(waId);
}

export function simulateInbound(message: InboundMessage) {
  const ctx = getOrCreateSession(message.waId);
  const { ctx: nextCtx, result } = applyTurn(ctx, message);
  sessions.set(message.waId, nextCtx);
  return { context: nextCtx, result };
}
