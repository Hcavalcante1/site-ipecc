/** Mensagens de erro do login (senha × perfil × sessão). */

export function mensagemErroLogin(params: {
  status?: number;
  apiError?: string | null;
  authErrorMessage?: string | null;
}): string {
  const api = (params.apiError || "").trim();
  const auth = (params.authErrorMessage || "").toLowerCase();

  if (
    auth.includes("invalid") ||
    auth.includes("credentials") ||
    auth.includes("invalid login") ||
    auth.includes("email not confirmed")
  ) {
    return "E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.";
  }

  if (auth.includes("too many requests") || auth.includes("rate limit")) {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
  }

  if (params.status === 401) {
    return (
      api ||
      "Sessão inválida. Tente novamente. Se o problema persistir, limpe os cookies do site."
    );
  }

  if (params.status === 403) {
    if (api.toLowerCase().includes("perfil")) {
      return "Autenticação ok, mas falta perfil de acesso. Contate o administrador.";
    }
    return api || "Acesso negado. Usuário sem permissão para esta área.";
  }

  if (api) return api;
  if (params.authErrorMessage) return "Erro de autenticação. Tente novamente.";
  return "Não foi possível entrar. Tente novamente.";
}

/** @deprecated Use mensagemErroLogin */
export const mensagemErroLoginAdmin = mensagemErroLogin;
