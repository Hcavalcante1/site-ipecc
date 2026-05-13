import { createClient } from "@supabase/supabase-js";

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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // 🔥 ESSA É A CORRETA
  );

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