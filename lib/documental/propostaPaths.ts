/** Metadados de anexos em colunas da tabela propostas (prepara futura proposta_anexos). */
export const ANEXOS_URL_PROPOSTA = [
  { key: "arquivo_url", label: "Proposta" },
  { key: "cnpj_url", label: "CNPJ" },
  { key: "contrato_social_url", label: "Contrato Social" },
  { key: "estatuto_url", label: "Estatuto" },
  { key: "ata_posse_url", label: "Ata e Posse" },
  { key: "doc_pessoal_url", label: "Documento Pessoal" },
  { key: "doc_representante_url", label: "Documento Representante" },
  { key: "procuracao_url", label: "Procuração" },
  { key: "certidao_federal_url", label: "Certidão Federal" },
  { key: "certidao_estadual_url", label: "Certidão Estadual" },
  { key: "certidao_municipal_url", label: "Certidão Municipal" },
  { key: "fgts_url", label: "FGTS" },
  { key: "cndt_url", label: "CNDT" },
  { key: "atestado_tecnico_url", label: "Atestado Técnico" },
  { key: "qualificacao_tecnica_url", label: "Qualificação Técnica" },
  { key: "equipe_tecnica_url", label: "Equipe Técnica" },
  { key: "portfolio_url", label: "Portfólio" },
  { key: "formacao_url", label: "Formação" },
  { key: "registro_profissional_url", label: "Registro Profissional" },
  { key: "comprovante_residencia_url", label: "Comprovante de Residência" },
  { key: "cpf_url", label: "CPF" },
] as const;

export type AnexoUrlPropostaKey = (typeof ANEXOS_URL_PROPOSTA)[number]["key"];

export type AnexoPropostaRef = {
  key: AnexoUrlPropostaKey;
  label: string;
  path: string;
};

export function extrairAnexosProposta(
  proposta: Record<string, unknown> | null | undefined
): AnexoPropostaRef[] {
  if (!proposta) return [];

  const itens: AnexoPropostaRef[] = [];
  for (const meta of ANEXOS_URL_PROPOSTA) {
    const valor = proposta[meta.key];
    if (typeof valor === "string" && valor.trim()) {
      itens.push({
        key: meta.key,
        label: meta.label,
        path: valor.trim(),
      });
    }
  }
  return itens;
}

/** Lista só os paths (listagem / APIs batch). */
export function extrairPathsAnexoProposta(
  proposta: Record<string, unknown> | null | undefined
): string[] {
  return extrairAnexosProposta(proposta).map((item) => item.path);
}

/** Candidatos de path no bucket propostas (inclui legado public/ e propostas/public/). */
export function candidatosPathProposta(filePath: string): string[] {
  const original = filePath.trim();
  const semPrefixoBucket = original
    .replace(/^propostas\/public\//i, "")
    .replace(/^propostas\//i, "");
  const limpo = semPrefixoBucket.replace(/^public\//, "").trim();

  const candidatos = [limpo, original, semPrefixoBucket];

  if (limpo && !limpo.startsWith("public/")) {
    candidatos.push(`public/${limpo}`);
  }
  if (semPrefixoBucket.startsWith("public/") && semPrefixoBucket !== limpo) {
    candidatos.push(semPrefixoBucket);
  }

  return [...new Set(candidatos.filter(Boolean))];
}
