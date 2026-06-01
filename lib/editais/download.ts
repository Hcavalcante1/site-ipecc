/** URL pública de download de PDF de edital (mesma regra em lista e detalhe). */
export function resolveEditalDownloadUrl(arquivoPdf?: string | null): string | null {
  if (!arquivoPdf) return null;

  const path = arquivoPdf.includes("/docs/")
    ? arquivoPdf.split("/docs/")[1]
    : arquivoPdf.replace(/^editais\//, "");

  return path ? `/api/download/editais/${path}` : null;
}

export function editalStatusLabel(status: string): string {
  if (status === "aberto") return "Aberto";
  if (status === "encerrado") return "Encerrado";
  if (status === "em_breve") return "Em breve";
  return "—";
}
