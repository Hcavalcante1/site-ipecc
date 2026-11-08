"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminRedefinirSenhaPage() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mensagem, setMensagem] = useState("Validando o link de redefinição...");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_error")) {
      setMensagem("Este link expirou ou não é válido. Peça ao administrador para enviar uma nova recuperação.");
      return;
    }
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const recovery = params.get("recovery") === "1" || hash.get("type") === "recovery";
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setAutorizado(true);
        setMensagem("");
      }
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && recovery) {
        setAutorizado(true);
        setMensagem("");
      } else {
        setMensagem("Abra o link de recuperação enviado ao seu e-mail. Se expirou, peça ao administrador um novo link.");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMensagem("");
    if (senha.length < 8) { setMensagem("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (senha !== confirmacao) { setMensagem("As senhas não conferem."); return; }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) { setMensagem("Não foi possível atualizar a senha. Peça uma nova recuperação ao administrador."); return; }
    const requestedRedirect = new URLSearchParams(window.location.search).get("redirect") || "/admin";
    const destino = requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/admin";
    router.replace(destino);
  }

  return (
    <main style={styles.wrapper}>
      <section style={styles.card}>
        <h1 style={styles.title}>Redefinir senha do acesso IPECC</h1>
        {autorizado ? (
          <form onSubmit={salvar} style={styles.form}>
            <p style={styles.text}>Crie uma senha nova para acessar o painel administrativo.</p>
            <label htmlFor="senha" style={styles.label}>Nova senha</label>
            <input id="senha" type="password" autoComplete="new-password" minLength={8} required value={senha} onChange={(e) => setSenha(e.target.value)} style={styles.input} />
            <label htmlFor="confirmacao" style={styles.label}>Confirme a nova senha</label>
            <input id="confirmacao" type="password" autoComplete="new-password" minLength={8} required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} style={styles.input} />
            {mensagem && <p role="alert" style={styles.error}>{mensagem}</p>}
            <button type="submit" disabled={salvando} style={styles.button}>{salvando ? "Salvando..." : "Salvar nova senha"}</button>
          </form>
        ) : (
          <p role="status" style={styles.text}>{mensagem}</p>
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
};
