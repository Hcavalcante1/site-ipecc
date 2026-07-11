/** Rotulos em portugues para acoes gravadas em admin_logs (INSERT/UPDATE/DELETE). */
export function labelAcaoAdmin(acao?: string | null): string {
  switch (acao) {
    case "INSERT":
      return "Inclusao";
    case "UPDATE":
      return "Atualizacao";
    case "DELETE":
      return "Exclusao";
    default:
      return acao || "-";
  }
}
