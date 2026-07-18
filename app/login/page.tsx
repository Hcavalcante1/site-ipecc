"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mensagemErroLoginAdmin } from "@/lib/auth/loginAdminMessages";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const year = new Date().getFullYear();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const emailTrim = email.trim();
      const passwordTrim = password.trim();

      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailTrim,
          password: passwordTrim,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        modulos?: string[];
        mestre?: boolean;
        session?: {
          access_token?: string;
          refresh_token?: string;
          expires_at?: number | null;
        } | null;
      };

      if (!res.ok || !body.session?.access_token || !body.session.refresh_token) {
        setMsg(
          mensagemErroLoginAdmin({
            status: res.status,
            apiError: body.error || null,
          })
        );
        setLoading(false);
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: body.session.access_token,
        refresh_token: body.session.refresh_token,
      });

      if (sessionError) {
        setMsg(
          mensagemErroLoginAdmin({
            authErrorMessage: sessionError.message,
          })
        );
        setLoading(false);
        return;
      }

      const mods = Array.isArray(body.modulos) ? body.modulos : [];
      if (!body.mestre && mods.length === 0) {
        // Entra no admin, mas avisa: falta escopo de modulos
        sessionStorage.setItem("ipecc_admin_aviso_sem_escopo", "1");
      } else {
        sessionStorage.removeItem("ipecc_admin_aviso_sem_escopo");
      }

      localStorage.removeItem("ipecc_admin_closed");
      sessionStorage.setItem("ipecc_admin_active", "1");
      window.location.assign("/admin");
    } catch (err) {
      setMsg(
        mensagemErroLoginAdmin({
          apiError: err instanceof Error ? err.message : "Erro ao autenticar.",
        })
      );
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
            <h1 style={styles.title}>Painel Administrativo</h1>
            <p style={styles.subtitle}>Acesso restrito ao sistema interno</p>
            <span style={styles.badge}>Área restrita - acesso autorizado</span>
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

            {msg && <p style={styles.error}>{msg}</p>}
          </form>
        </div>

        <footer style={styles.footer}>
          <p style={styles.footerLine}>
            IPECC | Painel administrativo institucional
          </p>
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
  badge: {
    display: "inline-block",
    marginTop: 12,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(134, 239, 172, 0.28)",
    background: "rgba(22, 163, 74, 0.12)",
    color: "#86efac",
    fontSize: 11,
    fontWeight: 700,
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
