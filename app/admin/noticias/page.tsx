"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

type Noticia = {
  id: string;
  titulo: string;
  resumo: string;
  publicado: boolean;
  created_at: string;
  processo_id?: string | null;
};

type Filtro = "todas" | "publicadas" | "rascunhos";

export default function NoticiasAdmin() {
  const escopo = useAdminEscopoCliente();
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("noticias")
      .select("*")
      .order("created_at", { ascending: false });
    const lista = ((data || []) as Noticia[]).filter((n) =>
      registroNoEscopoProcesso(n.processo_id, escopo.processoIds)
    );
    setNoticias(lista);
    setLoading(false);
  }, [escopo.processoIds]);

  useEffect(() => {
    if (escopo.loading) return;
    void carregar();
  }, [escopo.loading, carregar]);

  async function excluir(id: string, titulo: string) {
    const ok = await confirmAction(`Excluir a notícia "${titulo}"? Esta ação não pode ser desfeita.`);
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm(`Excluir a notícia "${titulo}"?`)) return;
      else if (isConfirmModalReady()) return;
    }
    setExcluindoId(id);
    const prev = noticias;
    setNoticias((l) => l.filter((n) => n.id !== id));
    const { error } = await supabase.from("noticias").delete().eq("id", id);
    setExcluindoId(null);
    if (error) {
      setNoticias(prev);
      triggerToast(`Erro ao excluir: ${error.message}`, "error");
    } else {
      triggerToast("Notícia excluída.", "success");
    }
  }

  const stTotal     = noticias.length;
  const stPublicadas= noticias.filter((n) => n.publicado).length;
  const stRascunhos = noticias.filter((n) => !n.publicado).length;

  const lista = noticias.filter((n) => {
    if (busca && !n.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtro === "publicadas" && !n.publicado) return false;
    if (filtro === "rascunhos" && n.publicado) return false;
    return true;
  });

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Notícias</h1>
          <p style={s.sub}>
            Gerencie as notícias publicadas em /noticias e nos destaques da página inicial.
          </p>
        </div>
        <a href="/admin/noticias/form" style={{ textDecoration: "none" }}>
          <button style={s.btnPrimario}>+ Nova notícia</button>
        </a>
      </div>

      {!loading && stTotal > 0 && (
        <div style={s.statsRow}>
          {([
            { key: "todas" as Filtro,      label: "Total",      valor: stTotal,      cor: "#94a3b8" },
            { key: "publicadas" as Filtro, label: "Publicadas", valor: stPublicadas, cor: "#86efac" },
            { key: "rascunhos" as Filtro,  label: "Rascunhos",  valor: stRascunhos,  cor: "#fbbf24" },
          ]).map((st) => (
            <div
              key={st.key}
              onClick={() => setFiltro(filtro === st.key ? "todas" : st.key)}
              style={{
                ...s.statCard,
                border: `1px solid ${filtro === st.key ? "#3b82f6" : "rgba(148,163,184,0.12)"}`,
                background: filtro === st.key ? "rgba(30,64,175,0.28)" : "rgba(15,23,42,0.85)",
              }}
            >
              <div style={{ ...s.statNum, color: st.cor }}>{st.valor}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && stTotal > 0 && (
        <div style={{ marginBottom: 16 }}>
          <input
            type="search"
            placeholder="Buscar por título..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={s.input}
          />
        </div>
      )}

      {loading || escopo.loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : lista.length === 0 ? (
        <p style={s.empty}>
          {stTotal === 0 ? "Nenhuma notícia cadastrada ainda." : "Nenhuma notícia corresponde ao filtro."}
        </p>
      ) : (
        <div style={s.grid}>
          {lista.map((n) => (
            <div key={n.id} style={s.card}>
              <div style={s.cardTop}>
                <span style={{ ...s.badge, ...(n.publicado ? s.badgePublicado : s.badgeRascunho) }}>
                  {n.publicado ? "Publicado" : "Rascunho"}
                </span>
                <span style={s.data}>
                  {new Date(n.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <strong style={s.cardTitulo}>{n.titulo}</strong>
              {n.resumo && <p style={s.cardResumo}>{n.resumo}</p>}
              <div style={s.acoesRow}>
                <a href={`/admin/noticias/form?id=${n.id}`} style={{ textDecoration: "none" }}>
                  <button style={s.btnEditar}>Editar</button>
                </a>
                <button
                  style={{ ...s.btnDel, opacity: excluindoId === n.id ? 0.6 : 1 }}
                  disabled={excluindoId === n.id}
                  onClick={() => excluir(n.id, n.titulo)}
                >
                  {excluindoId === n.id ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap:          { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo:        { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:           { margin: "6px 0 0", color: "#94a3b8", fontSize: 13, maxWidth: 560 },
  statsRow:      { display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 16 },
  statCard:      { flex: "1 1 120px", borderRadius: 14, padding: "12px 16px", cursor: "pointer" },
  statNum:       { fontSize: 24, fontWeight: 900, lineHeight: 1, marginBottom: 4 },
  statLabel:     { fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  input:         { width: "100%", maxWidth: 340, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },
  grid:          { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 },
  card:          { background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.14)", borderRadius: 16, padding: 18 },
  cardTop:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardTitulo:    { display: "block", fontSize: 15, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 },
  cardResumo:    { fontSize: 13, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 },
  acoesRow:      { display: "flex", gap: 8, marginTop: 10 },
  badge:         { display: "inline-flex", padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  badgePublicado:{ background: "rgba(22,101,52,0.28)", color: "#86efac", border: "1px solid #166534" },
  badgeRascunho: { background: "rgba(180,130,6,0.22)", color: "#fbbf24", border: "1px solid #92400e" },
  data:          { fontSize: 11, color: "#475569" },
  btnPrimario:   { padding: "9px 18px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnEditar:     { padding: "5px 12px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnDel:        { padding: "5px 12px", borderRadius: 8, border: "1px solid #7f1d1d", background: "rgba(127,29,29,0.18)", color: "#fca5a5", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  empty:         { color: "#64748b", marginTop: 24, textAlign: "center" },
};
