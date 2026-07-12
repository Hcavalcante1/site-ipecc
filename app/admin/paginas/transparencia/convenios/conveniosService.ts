import { supabase } from "@/lib/supabaseClient";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import type { Convenio } from "./types";

export async function getConvenios(
  processoIds: string[] | "todos" = "todos"
): Promise<Convenio[]> {
  const { data, error } = await supabase
    .from("transparencia_convenios")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data || []) as Convenio[]).filter((item) =>
    registroNoEscopoProcesso(item.processo_id, processoIds)
  );
}

export async function saveConvenio(convenio: Convenio): Promise<Convenio> {
  const payload = {
    edital_id: convenio.edital_id || null,
    proposta_id: convenio.proposta_id || null,
    processo_id: convenio.processo_id || null,
    titulo: convenio.titulo || null,
    numero_instrumento: convenio.numero_instrumento || null,
    tipo_instrumento: convenio.tipo_instrumento || null,
    categoria: convenio.categoria || null,
    objeto: convenio.objeto || null,
    contratado: convenio.contratado || null,
    cnpj: convenio.cnpj || null,
    data_assinatura: convenio.data_assinatura || null,
    vigencia_inicio: convenio.vigencia_inicio || null,
    vigencia_fim: convenio.vigencia_fim || null,
    status: convenio.status || null,
    plano_trabalho_url: convenio.plano_trabalho_url || null,
    documento_principal_url: convenio.documento_principal_url || null,
    relatorio_parcial_url: convenio.relatorio_parcial_url || null,
    relatorio_final_url: convenio.relatorio_final_url || null,
    observacoes: convenio.observacoes || null,
    ordem: convenio.ordem ?? 0,
    publicado: convenio.publicado ?? false,
  };

  if (convenio.id) {
    const { data, error } = await supabase
      .from("transparencia_convenios")
      .update(payload)
      .eq("id", convenio.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (payload.publicado) {
      await fetch("/api/admin/transparencia/ponte", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "prestacao_de_convenio",
          convenioId: convenio.id,
        }),
      }).catch(() => null);
    }

    return data;
  }

  const { data, error } = await supabase
    .from("transparencia_convenios")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteConvenio(id: string): Promise<void> {
  const { error } = await supabase
    .from("transparencia_convenios")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
