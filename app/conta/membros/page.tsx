"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Membro = { id: string; user_id: string; papel: string; ativo: boolean; email?: string };
type Convite = { id: string; email: string; papel: string; aceito_em: string | null; expires_at: string; created_at: string };

export default function MembrosPage() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailConvite, setEmailConvite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: minhaLinha } = await supabase
      .from("org_membros")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (!minhaLinha) { setLoading(false); return; }

    const { data: listaMembros } = await supabase
      .from("org_membros")
      .select("id, user_id, papel, ativo")
      .eq("org_id", minhaLinha.org_id)
      .order("created_at", { ascending: true });

    setMembros((listaMembros ?? []) as Membro[]);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const res = await fetch("/api/admin/convites", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = (await res.json()) as { ok: boolean; data?: Convite[] };
      if (json.ok) setConvites(json.data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function enviarConvite(e: React.FormEvent) {
    e.preventDefault();
    if (!emailConvite.trim()) return;
    setEnviando(true);
    setMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setMsg("Sessão expirada."); setEnviando(false); return; }

    const res = await fetch("/api/admin/convites", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: emailConvite.trim(), papel: "membro" }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string; email_enviado?: boolean; link?: string };

    if (json.ok) {
      setMsg(json.email_enviado ? "Convite enviado por e-mail." : `Convite criado. Link: ${json.link}`);
      setEmailConvite("");
      await carregar();
    } else {
      setMsg(`Erro: ${json.error ?? "desconhecido"}`);
    }
    setEnviando(false);
  }

  async function cancelarConvite(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch("/api/admin/convites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id }),
    });
    await carregar();
  }

  if (loading) return <div style={s.wrap}><p style={s.loading}>Carregando...</p></div>;

  return (
    <div style={s.wrap}>
      <h1 style={s.titulo}>Membros da organização</h1>
      <p style={s.sub}>Convide colaboradores para acessar sua organização.</p>

      <div style={s.card}>
        <h2 style={s.cardTitulo}>Convidar</h2>
        <form onSubmit={enviarConvite} style={s.formInline}>
          <input
            type="email"
            placeholder="email@colaborador.com"
            value={emailConvite}
            onChange={(e) => setEmailConvite(e.target.value)}
            required
            style={s.input}
          />
          <button type="submit" disabled={enviando} style={{ ...s.btn, opacity: enviando ? 0.7 : 1 }}>
            {enviando ? "Enviando..." : "Convidar"}
          </button>
        </form>
        {msg && <p style={s.msg}>{msg}</p>}
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitulo}>Membros ativos ({membros.length})</h2>
        {membros.length === 0 ? (
          <p style={s.vazio}>Nenhum membro ainda.</p>
        ) : (
          <ul style={s.lista}>
            {membros.map((m) => (
              <li key={m.id} style={s.item}>
                <span>{m.user_id}</span>
                <span style={s.papelTag}>{m.papel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitulo}>Convites pendentes ({convites.filter((c) => !c.aceito_em).length})</h2>
        {convites.filter((c) => !c.aceito_em).length === 0 ? (
          <p style={s.vazio}>Nenhum convite pendente.</p>
        ) : (
          <ul style={s.lista}>
            {convites.filter((c) => !c.aceito_em).map((c) => (
              <li key={c.id} style={s.item}>
                <span>{c.email} <span style={s.papelTag}>{c.papel}</span></span>
                <button style={s.btnCancelar} onClick={() => void cancelarConvite(c.id)}>Cancelar</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 32, color: "#e5e7eb", maxWidth: 800 },
  loading: { color: "#64748b" },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 24px", color: "#94a3b8", fontSize: 13 },
  card: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "22px 24px", marginBottom: 16 },
  cardTitulo: { margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#f1f5f9" },
  formInline: { display: "flex", gap: 10 },
  input: { flex: 1, padding: 11, borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#e5e7eb", fontSize: 14 },
  btn: { padding: "11px 18px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, cursor: "pointer" },
  msg: { fontSize: 12, color: "#93c5fd", marginTop: 10, marginBottom: 0 },
  vazio: { fontSize: 13, color: "#64748b", margin: 0 },
  lista: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(148,163,184,0.08)", fontSize: 13 },
  papelTag: { fontSize: 11, color: "#94a3b8", background: "rgba(148,163,184,0.1)", padding: "2px 8px", borderRadius: 999, marginLeft: 8 },
  btnCancelar: { padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.3)", background: "transparent", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" },
};
