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

export function usePropostaDocumental(
  proposta: any,
  certidoesEntidade: CertidaoEntidadeLinha[]
) {
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

    return [
      { label: "Proposta", path: proposta.arquivo_url, bg: "#22c55e", color: "#022c22" },
      { label: "CNPJ", path: proposta.cnpj_url, bg: "#3b82f6", color: "#fff" },
      { label: "Contrato Social", path: proposta.contrato_social_url, bg: "#a855f7", color: "#fff" },
      { label: "Estatuto", path: proposta.estatuto_url, bg: "#eab308", color: "#111827" },
      { label: "Ata e Posse", path: proposta.ata_posse_url, bg: "#8b5cf6", color: "#fff" },
      { label: "Documento Pessoal", path: proposta.doc_pessoal_url, bg: "#f97316", color: "#fff" },
      { label: "Documento Representante", path: proposta.doc_representante_url, bg: "#06b6d4", color: "#06283D" },
      { label: "Procuração", path: proposta.procuracao_url, bg: "#14b8a6", color: "#052e2b" },
      { label: "Certidão Federal", path: proposta.certidao_federal_url, bg: "#2563eb", color: "#fff" },
      { label: "Certidão Estadual", path: proposta.certidao_estadual_url, bg: "#4f46e5", color: "#fff" },
      { label: "Certidão Municipal", path: proposta.certidao_municipal_url, bg: "#7c3aed", color: "#fff" },
      { label: "FGTS", path: proposta.fgts_url, bg: "#16a34a", color: "#fff" },
      { label: "CNDT", path: proposta.cndt_url, bg: "#dc2626", color: "#fff" },
      { label: "Atestado Técnico", path: proposta.atestado_tecnico_url, bg: "#0891b2", color: "#fff" },
      { label: "Qualificação Técnica", path: proposta.qualificacao_tecnica_url, bg: "#0f766e", color: "#fff" },
      { label: "Equipe Técnica", path: proposta.equipe_tecnica_url, bg: "#1d4ed8", color: "#fff" },
      { label: "Portfólio", path: proposta.portfolio_url, bg: "#9333ea", color: "#fff" },
      { label: "Formação", path: proposta.formacao_url, bg: "#ea580c", color: "#fff" },
      { label: "Registro Profissional", path: proposta.registro_profissional_url, bg: "#475569", color: "#fff" },
      { label: "Comprovante de Residência", path: proposta.comprovante_residencia_url, bg: "#0ea5e9", color: "#fff" },
      { label: "CPF", path: proposta.cpf_url, bg: "#64748b", color: "#fff" },
    ].filter((item) => !!item.path);
  }, [proposta]);

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
