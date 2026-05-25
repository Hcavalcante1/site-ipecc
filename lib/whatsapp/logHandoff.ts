import { logWhatsApp } from "./logWhatsApp";

/**
 * Registra handoff do bot em admin_logs (service role, sem sessão humana).
 */
export async function logWhatsAppHandoff(
  waId: string,
  detalhes?: Record<string, unknown>
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { error } = await supabaseAdmin.from("admin_logs").insert({
      user_email: "whatsapp-bot@ipecc.local",
      acao: "HANDOFF",
      tabela: "whatsapp_conversations",
      registro_id: waId,
      detalhes: detalhes ?? { origem: "cloud_api" },
    });

    if (error) {
      logWhatsApp("handoff_log_error", { waId, error: error.message });
    }
  } catch (e) {
    logWhatsApp("handoff_log_exception", {
      waId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
