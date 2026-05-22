import { supabase } from "@/lib/supabaseClient";

export async function logAction({
  acao,
  tabela,
  registro_id,
  dados,
}: {
  acao: string;
  tabela: string;
  registro_id?: string;
  dados?: any;
}) {

  const { error } = await supabase.from("logs_atividade").insert({
    acao,
    tabela,
    registro_id,
    dados,
  });

  if (error) {
    console.error("ERRO LOG:", error.message);
  }
}