/** Kill switch — WHATSAPP_BOT_ENABLED=0 desliga respostas automáticas. */
export function isWhatsAppBotEnabled(): boolean {
  return process.env.WHATSAPP_BOT_ENABLED !== "0";
}

/** Sem ACCESS_TOKEN ou WHATSAPP_DRY_RUN=1: não chama Graph API (só log). */
export function isWhatsAppDryRun(): boolean {
  if (process.env.WHATSAPP_DRY_RUN === "1") return true;
  return !process.env.WHATSAPP_ACCESS_TOKEN?.trim();
}

export function isWhatsAppPersistenceEnabled(): boolean {
  return process.env.WHATSAPP_PERSIST_SUPABASE === "1";
}

export function getWhatsAppApiVersion(): string {
  return process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
}
