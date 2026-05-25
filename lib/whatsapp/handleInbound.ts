import { applyTurn } from "./botEngine";
import {
  isDuplicateMessage,
  loadConversation,
  markMessageProcessed,
  saveConversation,
} from "./conversationService";
import { sendWhatsAppText } from "./cloudApiClient";
import { isWhatsAppBotEnabled } from "./config";
import { logWhatsApp } from "./logWhatsApp";
import type { InboundMessage } from "./types";

export type HandleInboundResult = {
  skipped: boolean;
  reason?: string;
  repliesCount: number;
  handoff?: boolean;
  state?: string;
};

export async function handleInboundMessage(
  inbound: InboundMessage
): Promise<HandleInboundResult> {
  if (!isWhatsAppBotEnabled()) {
    logWhatsApp("bot_disabled", { waId: inbound.waId });
    return { skipped: true, reason: "bot_disabled", repliesCount: 0 };
  }

  if (isDuplicateMessage(inbound.messageId)) {
    return { skipped: true, reason: "duplicate", repliesCount: 0 };
  }

  if (inbound.messageId) {
    markMessageProcessed(inbound.messageId);
  }

  const ctx = await loadConversation(inbound.waId);
  const { ctx: nextCtx, result } = applyTurn(ctx, inbound);
  await saveConversation(nextCtx);

  logWhatsApp("turn", {
    waId: inbound.waId,
    state: nextCtx.state,
    handoff: result.handoff ?? false,
    replies: result.replies.length,
  });

  for (const reply of result.replies) {
    await sendWhatsAppText(inbound.waId, reply.text);
  }

  return {
    skipped: false,
    repliesCount: result.replies.length,
    handoff: result.handoff,
    state: nextCtx.state,
  };
}
