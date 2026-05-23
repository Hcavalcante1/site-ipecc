import { useMemo } from "react";
import {
  type CertidaoEntidadeLinha,
  calcularDiagnosticoDocumental,
  extrairMensagemPrincipal,
  extrairResumoAnexos,
  formatarCategoria,
  formatarTipoPessoa,
  montarChecklistDocumental,
  somenteDigitosCnpj,
} from "@/lib/documental";
import { DOWNLOAD_VISUAL_POR_COLUNA } from "@/components/admin/propostas/propostaDownloadStyles";
import { useAnexosPropostaResolvidos } from "@/components/admin/propostas/useAnexosPropostaResolvidos";

export function usePropostaDocumental(
  proposta: any,
  certidoesEntidade: CertidaoEntidadeLinha[]
) {
  const { anexos: anexosResolvidos } = useAnexosPropostaResolvidos(proposta);

  const cnpjProposta = useMemo(
    () => somenteDigitosCnpj(proposta?.cnpj),
    [proposta?.cnpj]
  );

  const tipoPessoa = useMemo(
    () => formatarTipoPessoa(proposta?.tipo),
    [proposta?.tipo]
  );

  const categoria = useMemo(
    () => formatarCategoria(proposta?.categoria, proposta?.mensagem),
    [proposta?.categoria, proposta?.mensagem]
  );

  const mensagemPrincipal = useMemo(
    () => extrairMensagemPrincipal(proposta?.mensagem),
    [proposta?.mensagem]
  );

  const checklistDocumental = useMemo(
    () => montarChecklistDocumental(proposta, proposta?.mensagem),
    [proposta]
  );

  const totalItensChecklist = useMemo(
    () => checklistDocumental.reduce((acc, g) => acc + g.itens.length, 0),
    [checklistDocumental]
  );

  const resumoAnexos = useMemo(() => {
    const itensChecklist = checklistDocumental.flatMap((grupo) =>
      grupo.itens.map((item) => ({
        chave: item.key,
        valor: item.path || "—",
      }))
    );
    if (itensChecklist.length > 0) return itensChecklist;
    return extrairResumoAnexos(proposta?.mensagem);
  }, [checklistDocumental, proposta?.mensagem]);

  const diagnosticoDocumental = useMemo(
    () =>
      calcularDiagnosticoDocumental(
        proposta,
        proposta?.tipo,
        checklistDocumental,
        certidoesEntidade,
        cnpjProposta
      ),
    [proposta, checklistDocumental, certidoesEntidade, cnpjProposta]
  );

  const downloads = useMemo(() => {
    if (!proposta) return [];

    return anexosResolvidos.map((anexo) => ({
      label: anexo.label,
      path: anexo.path,
      ...DOWNLOAD_VISUAL_POR_COLUNA[anexo.key],
    }));
  }, [proposta, anexosResolvidos]);

  return {
    cnpjProposta,
    tipoPessoa,
    categoria,
    mensagemPrincipal,
    checklistDocumental,
    totalItensChecklist,
    resumoAnexos,
    diagnosticoDocumental,
    downloads,
  };
}
