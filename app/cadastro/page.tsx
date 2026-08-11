"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Estado = "form" | "enviando" | "confirmar_email";

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [estado, setEstado] = useState<Estado>("form");
  const [msg, setMsg] = useState("");
  const year = new Date().getFullYear();

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (password.length < 8) {
      setMsg("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setEstado("enviando");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setMsg(error?.message || "Não foi possível criar a conta.");
      setEstado("form");
      return;
    }

    if (!data.session) {
      // Confirmacao de e-mail pendente. A criacao da organizacao acontece
      // no primeiro acesso a /conta, apos o login (nao depende de manter
      // estado local entre o cadastro e o clique no link do e-mail, que
      // pode acontecer em outro dispositivo).
      setEstado("confirmar_email");
      return;
    }

    router.push("/conta");
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.shell}>
        <div style={styles.card}>
          <div style={styles.logoBlock}>
            <img src="/media/ipecc_logo_v2.png" alt="IPECC" style={styles.logoImg} />
            <p style={styles.brandName}>IPECC</p>
            <h1 style={styles.title}>Criar conta</h1>
            <p style={styles.subtitle}>Comece a usar a plataforma em poucos minutos</p>
          </div>

          {estado === "confirmar_email" ? (
            <div style={styles.confirmBox}>
              <p style={styles.confirmTitle}>Confira seu e-mail</p>
              <p style={styles.confirmTexto}>
                Enviamos um link de confirmação para <strong>{email}</strong>. Clique no
                link, faça login e você poderá criar sua organização no painel.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCadastro} style={styles.form}>
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
                placeholder="Crie uma senha (mín. 8 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={styles.input}
                autoComplete="new-password"
              />

              <button
                type="submit"
                disabled={estado === "enviando"}
                style={{ ...styles.button, opacity: estado === "enviando" ? 0.7 : 1 }}
              >
                {estado === "enviando" ? "Criando conta..." : "Criar conta"}
              </button>

              {msg && <p style={styles.error}>{msg}</p>}

              <p style={styles.loginLink}>
                Já tem conta? <a href="/login" style={styles.link}>Entrar</a>
              </p>
            </form>
          )}
        </div>

        <footer style={styles.footer}>
          <p style={styles.footerLine}>IPECC | Plataforma institucional</p>
          <p style={styles.footerMeta}>CNPJ 05.965.225/0001-04 | {year} IPECC</p>
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
  shell: { width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 16 },
  card: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 40,
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
    backdropFilter: "blur(10px)",
  },
  logoBlock: { textAlign: "center", marginBottom: 30 },
  logoImg: { maxWidth: 150, width: "100%", height: "auto", display: "block", margin: "0 auto 14px auto", objectFit: "contain" },
  brandName: { margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", color: "#e2e8f0" },
  title: { margin: "10px 0 0", fontSize: 20, fontWeight: 700, color: "#e5e7eb" },
  subtitle: { marginTop: 6, fontSize: 13, color: "#94a3b8" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  input: { padding: 14, borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#e5e7eb", fontSize: 14 },
  button: {
    padding: 14,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg,#22c55e,#16a34a)",
    color: "#022c22",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: { color: "#f87171", fontSize: 13, textAlign: "center" },
  loginLink: { textAlign: "center", fontSize: 13, color: "#94a3b8", margin: 0 },
  link: { color: "#93c5fd", fontWeight: 600, textDecoration: "none" },
  confirmBox: { textAlign: "center", padding: "12px 4px" },
  confirmTitle: { fontSize: 16, fontWeight: 800, color: "#86efac", margin: "0 0 12px" },
  confirmTexto: { fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: 0 },
  footer: { textAlign: "center", padding: "4px 8px 0" },
  footerLine: { margin: 0, fontSize: 12, color: "#94a3b8" },
  footerMeta: { margin: "6px 0 0", fontSize: 11, color: "#64748b" },
};
