import {
  applyTurn,
  createInitialContext,
} from "@/lib/whatsapp/botEngine";
import { MENU_OPTIONS } from "@/lib/whatsapp/botMenu";
import {
  TOPIC_SCRIPTS,
  topicStateToId,
} from "@/lib/whatsapp/botTopicScripts";
import type { ConversationContext, ConversationState } from "@/lib/whatsapp/types";

/** Remove marcação * do WhatsApp para exibir no chat do site. */
export function formatBotTextForSite(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1").trim();
}

export function createSiteBotContext(): ConversationContext {
  return createInitialContext("site-visitor");
}

export type SiteBotTurn = {
  replies: string[];
  ctx: ConversationContext;
  handoff: boolean;
};

/**
 * Script automático do assistente no site (mesmo motor do bot WhatsApp).
 * Não depende da Meta Cloud API.
 */
export function runSiteBotTurn(
  ctx: ConversationContext,
  text: string
): SiteBotTurn {
  const { ctx: nextCtx, result } = applyTurn(ctx, {
    waId: ctx.waId,
    text,
    fromSite: true,
  });

  return {
    replies: result.replies.map((r) => formatBotTextForSite(r.text)),
    ctx: nextCtx,
    handoff: Boolean(result.handoff),
  };
}

export type SiteBotQuickOption = { id: string; label: string };

/** Botões rápidos conforme o estado (menu 1–6 ou submenu A/B/C). */
export function getSiteBotQuickOptions(
  state: ConversationState
): SiteBotQuickOption[] {
  const topicId = topicStateToId(state);
  if (topicId) {
    const script = TOPIC_SCRIPTS[topicId];
    return [
      ...script.subs.map((s) => ({
        id: s.key,
        label: `${s.key.toUpperCase()} · ${s.label}`,
      })),
      { id: "0", label: "0 · Menu principal" },
      { id: "6", label: "6 · Equipe" },
    ];
  }

  return MENU_OPTIONS.map((o) => ({
    id: o.key,
    label: `${o.key} · ${o.label}`,
  }));
}

/** @deprecated use getSiteBotQuickOptions */
export const SITE_BOT_QUICK_OPTIONS: SiteBotQuickOption[] =
  MENU_OPTIONS.map((o) => ({
    id: o.key,
    label: `${o.key} · ${o.label}`,
  }));
