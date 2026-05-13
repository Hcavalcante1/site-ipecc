"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setMsg("E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }

      // 🔥 CORREÇÃO: força persistência da sessão
      await supabase.auth.getSession();

      // mantém seu fluxo original
      window.location.href = "/admin";
    } catch (error) {
      setMsg("Erro ao autenticar.");
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoBlock}>
          <div style={styles.logoCircle}>IPECC</div>
          <h1 style={styles.title}>Painel Administrativo</h1>
          <p style={styles.subtitle}>Acesso restrito ao sistema interno</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
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
    </div>
  );
}

/* ================= ESTILO ================= */

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #020617, #0f172a)",
    padding: 20,
  },

  card: {
    width: 380,
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

  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    background: "linear-gradient(90deg,#22c55e,#16a34a)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 24,
    color: "#022c22",
    margin: "0 auto 16px auto",
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
};