import { CHAVES_POR_GRUPO, NUCLEO_POR_TIPO } from "./constants";
import { montarChecklistDocumental } from "./parser";

export function normalizarTipoProposta(
  tipo?: string
): "pessoa_juridica" | "osc" | "pessoa_fisica" {
  if (tipo === "osc") return "osc";
  if (tipo === "pessoa_fisica" || tipo === "pf") return "pessoa_fisica";
  return "pessoa_juridica";
}

export function chavesEnviadasProposta(
  proposta: Record<string, unknown> | null,
  checklist: ReturnType<typeof montarChecklistDocumental>
) {
  const keys = new Set<string>();
  checklist.forEach((grupo) => {
    grupo.itens.forEach((item) => keys.add(item.key));
  });
  if (typeof proposta?.arquivo_url === "string" && proposta.arquivo_url.trim()) {
    keys.add("proposta");
  }
  return keys;
}

export function chavesCondicionaisPorTipo(tipo: "pessoa_juridica" | "osc" | "pessoa_fisica") {
  const nucleo = new Set(NUCLEO_POR_TIPO[tipo]);
  const todas = (
    [
      ...CHAVES_POR_GRUPO.habilitacao_juridica,
      ...CHAVES_POR_GRUPO.regularidade_fiscal_trabalhista,
      ...CHAVES_POR_GRUPO.qualificacao_tecnica,
      ...CHAVES_POR_GRUPO.outros,
    ] as string[]
  ).filter((chave, index, arr) => arr.indexOf(chave) === index);

  return todas.filter((chave) => !nucleo.has(chave));
}
