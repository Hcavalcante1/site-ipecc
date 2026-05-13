import { supabase } from "@/lib/supabaseClient";

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
  } catch (e) {
    console.error("Erro ao logar ação:", e);
  }
}