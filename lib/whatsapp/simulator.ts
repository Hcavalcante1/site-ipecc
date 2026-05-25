import { applyTurn } from "./botEngine";
import {
  loadConversation,
  resetConversationMemory,
  saveConversation,
} from "./conversationService";
import type { InboundMessage } from "./types";

export function resetSession(waId: string): void {
  resetConversationMemory(waId);
}

export async function simulateInbound(message: InboundMessage) {
  const ctx = await loadConversation(message.waId);
  const { ctx: nextCtx, result } = applyTurn(ctx, message);
  await saveConversation(nextCtx);
  return { context: nextCtx, result };
}
