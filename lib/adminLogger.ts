import { supabase } from "@/lib/supabaseClient";
import { logAdminAction } from "@/lib/observability/adminActionLog";

export async function logAction({
  acao,
  tabela,
  registro_id,
  detalhes,
}: {
  acao: string;
  tabela: string;
  registro_id?: string;
  detalhes?: any;
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("admin_logs").insert({
      user_email: user?.email || "desconhecido",
      acao,
      tabela,
      registro_id,
      detalhes,
    });

    logAdminAction({
      action: acao,
      table: tabela,
      recordId: registro_id,
      userEmail: user?.email || "desconhecido",
    });
  } catch (e) {
    console.error("Erro ao logar ação:", e);
    logAdminAction({
      action: acao,
      table: tabela,
      recordId: registro_id,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}