/** Mensagens de erro do login admin (senha × perfil × sessão). */

export function mensagemErroLoginAdmin(params: {
  status?: number;
  apiError?: string | null;
  authErrorMessage?: string | null;
}): string {
  const api = (params.apiError || "").trim();
  const auth = (params.authErrorMessage || "").toLowerCase();

  if (
    auth.includes("invalid") ||
    auth.includes("credentials") ||
    auth.includes("invalid login")
  ) {
    return "E-mail ou senha inválidos. Confira o usuário na autenticação do Supabase.";
  }

  if (params.status === 401) {
    return (
      api ||
      "Sessão inválida. Tente de novo. Se persistir, limpe os cookies do site."
    );
  }

  if (params.status === 403) {
    if (api.toLowerCase().includes("perfil")) {
      return "Autenticação ok, mas falta perfil em /admin/acessos (operador/externo ativo).";
    }
    return (
      api ||
      "Acesso negado. Usuário autenticado, porém sem permissão de admin (Acessos)."
    );
  }

  if (api) return api;
  if (params.authErrorMessage) return params.authErrorMessage;
  return "Não foi possível entrar no painel admin.";
}
