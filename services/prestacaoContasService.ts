import { supabase } from "@/lib/supabaseClient";
import type { Convenio, PrestacaoConta } from "@/app/admin/paginas/transparencia/prestacao/types";

export async function getConvenios(): Promise<Convenio[]> {
  const { data, error } = await supabase
    .from("transparencia_convenios")
    .select(
      "id, titulo, numero_instrumento, tipo_instrumento, contratado, vigencia_inicio, vigencia_fim, status"
    )
    .order("ordem", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getPrestacoes(): Promise<PrestacaoConta[]> {
  const { data, error } = await supabase
    .from("transparencia_prestacao_contas")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function savePrestacao(
  payload: PrestacaoConta
): Promise<PrestacaoConta> {
  const record = {
    convenio_id: payload.convenio_id,
    fase_prestacao: payload.fase_prestacao,
    status_prestacao: payload.status_prestacao,
    tipo_documento: payload.tipo_documento,
    documento_url: payload.documento_url,
    referencia_inicio: payload.referencia_inicio || null,
    referencia_fim: payload.referencia_fim || null,
    ordem: payload.ordem || 0,
    publicado: payload.publicado ?? true,
  };

  if (payload.id) {
    const response = await supabase
      .from("transparencia_prestacao_contas")
      .update(record)
      .eq("id", payload.id)
      .select()
      .single();

    if (response.error) {
      throw response.error;
    }

    return response.data;
  }

  const response = await supabase
    .from("transparencia_prestacao_contas")
    .insert(record)
    .select()
    .single();

  if (response.error) {
    throw response.error;
  }

  return response.data;
}

export async function deletePrestacao(id: string): Promise<void> {
  const { error } = await supabase
    .from("transparencia_prestacao_contas")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export { supabase };
