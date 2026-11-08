"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

function caminhoLocal(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "";
  } catch {
    return "";
  }
}

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [nextPath, setNextPath] = useState("");
  const [status, setStatus] = useState<"form" | "enviando" | "enviado">("form");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
    setNextPath(caminhoLocal(params.get("redirect")));
  }, []);

  async function solicitar(e: FormEvent) {
    e.preventDefault();
    setMensagem("");
    setStatus("enviando");

    const destino = `/redefinir-senha?recovery=1${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}`;
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", destino);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: callback.toString(),
    });

    if (error) {
      setMensagem("Não foi possível solicitar o link agora. Confira o e-mail e tente novamente.");
      setStatus("form");
      return;
    }

    setStatus("enviado");
  }

  return (
    <main style={styles.wrapper}>
      <section style={styles.card}>
        <h1 style={styles.title}>Redefinir senha</h1>
        {status === "enviado" ? (
          <div>
            <p style={styles.text}>
              Se houver uma conta cadastrada com esse e-mail, enviaremos um link para redefinir a senha.
              Verifique também a pasta de spam.
            </p>
            <a href="/login" style={styles.link}>Voltar para entrar</a>
          </div>
        ) : (
          <form onSubmit={solicitar} style={styles.form}>
            <p style={styles.text}>Informe o e-mail usado no acesso. Enviaremos um link para criar outra senha.</p>
            <label htmlFor="email" style={styles.label}>E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="voce@exemplo.com"
            />
            {mensagem && <p role="alert" style={styles.error}>{mensagem}</p>}
            <button type="submit" disabled={status === "enviando"} style={styles.button}>
              {status === "enviando" ? "Enviando..." : "Enviar link de redefinição"}
            </button>
            <a href="/login" style={styles.link}>Voltar para entrar</a>
          </form>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#020617,#0f172a)", padding: 20 },
  card: { width: "100%", maxWidth: 440, padding: 36, borderRadius: 20, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 20px 50px rgba(0,0,0,.45)" },
  title: { margin: "0 0 16px", textAlign: "center", color: "#e5e7eb", fontSize: 22 },
  text: { color: "#94a3b8", fontSize: 14, lineHeight: 1.6 },
  form: { display: "grid", gap: 14 },
  label: { color: "#cbd5e1", fontSize: 13 },
  input: { padding: 14, borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#e5e7eb", fontSize: 14 },
  button: { padding: 14, border: 0, borderRadius: 10, background: "linear-gradient(90deg,#22c55e,#16a34a)", color: "#022c22", fontWeight: 700, cursor: "pointer" },
  error: { color: "#fca5a5", fontSize: 13 },
  link: { display: "block", marginTop: 12, color: "#93c5fd", textAlign: "center", textDecoration: "none", fontWeight: 600 },
};
