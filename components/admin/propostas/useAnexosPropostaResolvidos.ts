import { useEffect, useMemo, useState } from "react";
import {
  anexoRowParaRef,
  resolverAnexosProposta,
  usePropostaAnexosTableLeitura,
} from "@/lib/documental/propostaAnexosHibrido";
import { extrairAnexosProposta, type AnexoPropostaRef } from "@/lib/documental/propostaPaths";
import { supabase } from "@/lib/supabaseClient";

export function useAnexosPropostaResolvidos(
  proposta: Record<string, unknown> | null | undefined
) {
  const hibridoAtivo = usePropostaAnexosTableLeitura();
  const [anexosTabela, setAnexosTabela] = useState<AnexoPropostaRef[] | undefined>(
    undefined
  );
  const [carregandoTabela, setCarregandoTabela] = useState(false);

  const propostaId = proposta?.id != null ? String(proposta.id) : "";

  useEffect(() => {
    if (!propostaId || !hibridoAtivo) {
      setAnexosTabela(undefined);
      setCarregandoTabela(false);
      return;
    }

    let cancelado = false;

    async function carregar() {
      setCarregandoTabela(true);
      setAnexosTabela(undefined);

      const { data, error } = await supabase
        .from("proposta_anexos")
        .select("proposta_id, chave, label, storage_path, status")
        .eq("proposta_id", propostaId)
        .eq("status", "ativo");

      if (cancelado) return;

      if (error) {
        setAnexosTabela([]);
        setCarregandoTabela(false);
        return;
      }

      const refs: AnexoPropostaRef[] = [];
      for (const row of data || []) {
        const ref = anexoRowParaRef(row);
        if (ref) refs.push(ref);
      }

      setAnexosTabela(refs);
      setCarregandoTabela(false);
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [propostaId, hibridoAtivo]);

  const anexos = useMemo(() => {
    if (!proposta) return [];
    if (!hibridoAtivo || anexosTabela === undefined) {
      return extrairAnexosProposta(proposta);
    }
    return resolverAnexosProposta(proposta, anexosTabela);
  }, [proposta, hibridoAtivo, anexosTabela]);

  return { anexos, carregandoTabela: hibridoAtivo && carregandoTabela };
}
