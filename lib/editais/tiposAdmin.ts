/**
 * Modalidades de edital / chamamento no admin.
 * Mesmo padrao de FASES_GOVERNANCA: fonte unica para selects.
 */

export const TIPOS_EDITAL_ADMIN = [
  "Chamamento público",
  "Edital",
  "Credenciamento",
  "Cotação prévia de preços",
] as const;

export type TipoEditalAdmin = (typeof TIPOS_EDITAL_ADMIN)[number];

export const TIPO_EDITAL_PADRAO: TipoEditalAdmin = "Chamamento público";

export const TIPO_EDITAL_COTACAO_PREVIA: TipoEditalAdmin =
  "Cotação prévia de preços";

export function isModalidadeCotacaoPrevia(tipo?: string | null): boolean {
  const valor = String(tipo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return valor.includes("cotacao previa");
}