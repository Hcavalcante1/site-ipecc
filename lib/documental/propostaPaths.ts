const COLUNAS_URL_PROPOSTA = [
  "arquivo_url",
  "cnpj_url",
  "contrato_social_url",
  "estatuto_url",
  "ata_posse_url",
  "doc_pessoal_url",
  "doc_representante_url",
  "procuracao_url",
  "certidao_federal_url",
  "certidao_estadual_url",
  "certidao_municipal_url",
  "fgts_url",
  "cndt_url",
  "atestado_tecnico_url",
  "qualificacao_tecnica_url",
  "equipe_tecnica_url",
  "portfolio_url",
  "formacao_url",
  "registro_profissional_url",
  "comprovante_residencia_url",
  "cpf_url",
] as const;

export function extrairPathsAnexoProposta(
  proposta: Record<string, unknown> | null | undefined
): string[] {
  if (!proposta) return [];

  const paths: string[] = [];
  for (const key of COLUNAS_URL_PROPOSTA) {
    const valor = proposta[key];
    if (typeof valor === "string" && valor.trim()) {
      paths.push(valor.trim());
    }
  }
  return paths;
}
