"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mensagemErroLogin } from "@/lib/auth/loginAdminMessages";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgKind, setMsgKind] = useState<"error" | "success">("error");
  const year = new Date().getFullYear();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("senha") === "atualizada") {
      setMsg("Senha redefinida. Entre com a nova senha.");
      setMsgKind("success");
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgKind("error");
    setLoading(true);

    try {
      const emailTrim = email.trim();
      const passwordTrim = password.trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrim,
        password: passwordTrim,
      });

      if (error || !data.session?.access_token) {
        setMsg(
          mensagemErroLogin({
            authErrorMessage: error?.message || null,
          })
        );
        setLoading(false);
        return;
      }

      // Verifica se o usuário tem perfil admin
      const gate = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const body = (await gate.json().catch(() => ({}))) as {
        error?: string;
        modulos?: string[];
        mestre?: boolean;
      };

      if (!gate.ok) {
        // Usuário não é admin — redireciona para painel do cliente
        if (gate.status === 403) {
          const requestedRedirect = new URLSearchParams(window.location.search).get("redirect") || "";
          let safeRedirect = "";
          if (requestedRedirect) {
            try {
              const parsed = new URL(requestedRedirect, window.location.origin);
              if (parsed.origin === window.location.origin) safeRedirect = `${parsed.pathname}${parsed.search}${parsed.hash}`;
            } catch { /* Ignora destino inválido e usa o painel padrão. */ }
          }
          window.location.assign(safeRedirect || "/admin");
          return;
        }

        await supabase.auth.signOut().catch(() => null);
        setMsg(
          mensagemErroLogin({
            status: gate.status,
            apiError: body.error || null,
          })
        );
        setLoading(false);
        return;
      }

      const mods = Array.isArray(body.modulos) ? body.modulos : [];
      if (!body.mestre && mods.length === 0) {
        sessionStorage.setItem("ipecc_admin_aviso_sem_escopo", "1");
      } else {
        sessionStorage.removeItem("ipecc_admin_aviso_sem_escopo");
      }

      localStorage.removeItem("ipecc_admin_closed");
      sessionStorage.setItem("ipecc_admin_active", "1");
      const requestedRedirect = new URLSearchParams(window.location.search).get("redirect") || "";
      let safeRedirect = "";
      if (requestedRedirect) {
        try {
          const parsed = new URL(requestedRedirect, window.location.origin);
          if (parsed.origin === window.location.origin) safeRedirect = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        } catch { /* Ignora destino inválido e usa o painel padrão. */ }
      }
      window.location.assign(safeRedirect || "/admin");
    } catch (err) {
      setMsg(
        mensagemErroLogin({
          apiError: err instanceof Error ? err.message : "Erro ao autenticar.",
        })
      );
      setLoading(false);
    }
  }

  async function handleRecuperacao() {
    const emailTrim = email.trim();
    if (!emailTrim) {
      setMsgKind("error");
      setMsg("Informe seu e-mail para receber o link de recuperação.");
      return;
    }
    setMsg("");
    setLoading(true);
    const redirectParams = new URLSearchParams();
    const requestedRedirect = new URLSearchParams(window.location.search).get("redirect") || "";
    if (!requestedRedirect) {
      redirectParams.set("redirect", "/admin");
    }
    if (requestedRedirect) {
      try {
        const parsed = new URL(requestedRedirect, window.location.origin);
        if (parsed.origin === window.location.origin) {
          redirectParams.set("redirect", `${parsed.pathname}${parsed.search}${parsed.hash}`);
        }
      } catch { /* Ignora destino inválido. */ }
    }
    const recoveryPage = new URL("/admin/redefinir-senha", "https://www.ipecc.org.br");
    recoveryPage.searchParams.set("recovery", "1");
    for (const [key, value] of redirectParams) recoveryPage.searchParams.set(key, value);
    const recoveryUrl = new URL("/admin/auth/callback", "https://www.ipecc.org.br");
    recoveryUrl.searchParams.set("next", `${recoveryPage.pathname}${recoveryPage.search}`);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailTrim, {
        redirectTo: recoveryUrl.toString(),
      });
      setMsgKind(error ? "error" : "success");
      setMsg(error
        ? "Não foi possível iniciar a recuperação. Tente novamente ou contate o administrador."
        : "Se o e-mail estiver ativo, enviaremos um link para redefinir a senha.");
    } catch {
      setMsgKind("error");
      setMsg("Não foi possível iniciar a recuperação. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.shell}>
        <div style={styles.card}>
          <div style={styles.logoBlock}>
            <img
              src="/media/ipecc_logo_v2.png"
              alt="IPECC"
              style={styles.logoImg}
            />
            <p style={styles.brandName}>IPECC</p>
            <p style={styles.brandTag}>
              Instituto Paulista de Esporte, Cultura e Cidadania
            </p>
            <h1 style={styles.title}>Entrar na sua conta</h1>
            <p style={styles.subtitle}>Bem-vindo(a) de volta</p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              autoComplete="username"
            />

            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {msg && <p style={msgKind === "success" ? styles.success : styles.error}>{msg}</p>}
          </form>

          <p style={styles.cadastroLink}>
            <a
              href="#recuperar-senha"
              style={styles.link}
              onClick={(event) => { event.preventDefault(); void handleRecuperacao(); }}
            >
              Esqueci minha senha
            </a>
          </p>
        </div>

        <footer style={styles.footer}>
          <p style={styles.footerLine}>IPECC | Plataforma institucional</p>
          <p style={styles.footerMeta}>
            CNPJ 05.965.225/0001-04 | {year} IPECC
          </p>
        </footer>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #020617, #0f172a)",
    padding: 20,
  },
  shell: {
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  card: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 40,
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
    backdropFilter: "blur(10px)",
  },
  logoBlock: {
    textAlign: "center",
    marginBottom: 30,
  },
  logoImg: {
    maxWidth: 150,
    width: "100%",
    height: "auto",
    display: "block",
    margin: "0 auto 14px auto",
    objectFit: "contain",
  },
  brandName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#e2e8f0",
  },
  brandTag: {
    margin: "6px 0 14px",
    fontSize: 12,
    lineHeight: 1.4,
    color: "#94a3b8",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#e5e7eb",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#94a3b8",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  input: {
    padding: 14,
    borderRadius: 10,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#e5e7eb",
    fontSize: 14,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg,#22c55e,#16a34a)",
    color: "#022c22",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  error: {
    color: "#f87171",
    fontSize: 13,
    textAlign: "center",
  },
  success: {
    color: "#86efac",
    fontSize: 13,
    textAlign: "center",
  },
  cadastroLink: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 13,
    color: "#94a3b8",
  },
  link: {
    color: "#93c5fd",
    fontWeight: 700,
    textDecoration: "none",
  },
  footer: {
    textAlign: "center",
    padding: "4px 8px 0",
  },
  footerLine: {
    margin: 0,
    fontSize: 12,
    color: "#94a3b8",
  },
  footerMeta: {
    margin: "6px 0 0",
    fontSize: 11,
    color: "#64748b",
  },
};
