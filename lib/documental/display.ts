export function formatarTipoPessoa(tipo?: string) {
  if (tipo === "pessoa_juridica") return "Pessoa Jurídica";
  if (tipo === "osc") return "OSC";
  if (tipo === "pessoa_fisica") return "Pessoa Física";
  if (tipo === "empresa") return "Pessoa Jurídica";
  if (tipo === "pf") return "Pessoa Física";
  return tipo || "—";
}

export function formatarCategoria(categoria?: string | null, mensagem?: string) {
  if (mensagem) {
    const envioCompleto = mensagem
      .split("\n")
      .some((item) =>
        item.trim().toLowerCase().includes("envio completo com múltiplas categorias")
      );
    if (envioCompleto) {
      return "Envio completo (múltiplas categorias documentais)";
    }
  }

  if (categoria === "habilitacao_juridica") return "Habilitação Jurídica";
  if (categoria === "regularidade_fiscal_trabalhista") {
    return "Regularidade Fiscal e Trabalhista";
  }
  if (categoria === "qualificacao_tecnica") return "Qualificação Técnica";

  if (!mensagem) return "—";

  const linha = mensagem
    .split("\n")
    .find((item) => item.trim().toLowerCase().startsWith("categoria:"));

  if (!linha) return "—";

  return linha.replace(/^categoria:\s*/i, "").trim() || "—";
}
