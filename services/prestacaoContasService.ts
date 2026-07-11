import { supabase } from "@/lib/supabaseClient";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import type { Convenio, PrestacaoConta } from "@/app/admin/paginas/transparencia/prestacao/types";

export async function getConvenios(
  processoIds: string[] | "todos" = "todos"
): Promise<Convenio[]> {
  const { data, error } = await supabase
    .from("transparencia_convenios")
    .select(
      "id, titulo, numero_instrumento, tipo_instrumento, contratado, vigencia_inicio, vigencia_fim, status, processo_id"
    )
    .order("ordem", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data || []) as Convenio[]).filter((item) =>
    registroNoEscopoProcesso(item.processo_id, processoIds)
  );
}

export async function getPrestacoes(
  processoIds: string[] | "todos" = "todos"
): Promise<PrestacaoConta[]> {
  const { data, error } = await supabase
    .from("transparencia_prestacao_contas")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data || []) as PrestacaoConta[];
  if (processoIds === "todos") return rows;

  const conveniosEscopo = await getConvenios(processoIds);
  const convenioIds = new Set(
    conveniosEscopo.map((c) => c.id).filter((id): id is string => Boolean(id))
  );

  return rows.filter((item) => {
    if (registroNoEscopoProcesso(item.processo_id, processoIds)) return true;
    if (item.convenio_id && convenioIds.has(item.convenio_id)) return true;
    return false;
  });
}

export async function savePrestacao(
  payload: PrestacaoConta
): Promise<PrestacaoConta> {
  const record = {
    convenio_id: payload.convenio_id,
    processo_id: payload.processo_id || null,
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
