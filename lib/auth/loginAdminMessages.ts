/** Mensagens de erro do login admin (senha × perfil × sessao). */

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
    return "E-mail ou senha invalidos. Confira o usuario no Supabase Auth.";
  }

  if (params.status === 401) {
    return (
      api ||
      "Sessao invalida. Tente de novo. Se persistir, limpe cookies do site."
    );
  }

  if (params.status === 403) {
    if (api.toLowerCase().includes("perfil")) {
      return "Login Auth ok, mas falta perfil em /admin/acessos (operador/externo ativo).";
    }
    return (
      api ||
      "Acesso negado. Usuario autenticado, porem sem permissao admin (Acessos)."
    );
  }

  if (api) return api;
  if (params.authErrorMessage) return params.authErrorMessage;
  return "Nao foi possivel entrar no painel admin.";
}
