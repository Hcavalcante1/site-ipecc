"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { triggerToast } from "@/components/AdminToast";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";

type Processo = {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  resumo?: string | null;
  created_at?: string;
};

type Filtro = "todos" | "ativo" | "encerrado";

const TIPOS = [
  { value: "interno_ipecc",    label: "Interno IPECC" },
  { value: "publico_externo",  label: "Contratação pública externa" },
  { value: "privado_externo",  label: "Contratação privada externa" },
] as const;

const STATUS_ESTILO: Record<string, React.CSSProperties> = {
  ativo:     { background: "rgba(22,101,52,0.28)",   color: "#86efac", border: "1px solid #166534" },
  encerrado: { background: "rgba(100,116,139,0.18)", color: "#94a3b8", border: "1px solid #334155" },
};

function labelTipo(v: string) {
  return TIPOS.find((t) => t.value === v)?.label ?? v.replace(/_/g, " ");
}

export default function AdminProcessosPage() {
  const [lista, setLista]     = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg]         = useState("");
  const [busca, setBusca]     = useState("");
  const [filtro, setFiltro]   = useState<Filtro>("todos");
  const [titulo, setTitulo]   = useState("");
  const [tipo, setTipo]       = useState<string>("interno_ipecc");
  const [resumo, setResumo]   = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res  = await fetch("/api/admin/processos", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Erro ao carregar processos.");
        setLista([]);
      } else {
        setLista((json.processos || []) as Processo[]);
      }
    } catch {
      setMsg("Falha de rede ao carregar processos.");
      setLista([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criar() {
    if (!titulo.trim()) {
      triggerToast("Informe o título do processo.", "error");
      return;
    }
    setSalvando(true);
    try {
      const res  = await fetch("/api/admin/processos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "criar", titulo: titulo.trim(), tipo, resumo: resumo.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) { triggerToast(json.error || "Erro ao criar.", "error"); setSalvando(false); return; }
      setTitulo(""); setResumo(""); setMostrarForm(false);
      triggerToast("Processo criado.", "success");
      await carregar();
    } catch {
      triggerToast("Falha de rede ao criar processo.", "error");
    }
    setSalvando(false);
  }

  async function encerrar(id: string, tituloProcesso: string) {
    const ok = await confirmAction(`Encerrar o processo "${tituloProcesso}"? Esta ação não pode ser desfeita pela interface.`);
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm(`Encerrar "${tituloProcesso}"?`)) return;
      else if (isConfirmModalReady()) return;
    }
    try {
      const res  = await fetch("/api/admin/processos", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "encerrar", id }),
      });
      const json = await res.json();
      if (!res.ok) { triggerToast(json.error || "Erro ao encerrar.", "error"); return; }
      triggerToast("Processo encerrado.", "success");
      void carregar();
    } catch {
      triggerToast("Falha de rede ao encerrar.", "error");
    }
  }

  async function excluir(id: string, tituloProcesso: string) {
    const ok = await confirmAction(`Excluir permanentemente o processo "${tituloProcesso}"? Os documentos vinculados não serão afetados.`);
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm(`Excluir "${tituloProcesso}"?`)) return;
      else if (isConfirmModalReady()) return;
    }
    try {
      const res  = await fetch("/api/admin/processos", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "excluir", id }),
      });
      const json = await res.json();
      if (!res.ok) { triggerToast(json.error || "Erro ao excluir.", "error"); return; }
      triggerToast("Processo excluído.", "success");
      void carregar();
    } catch {
      triggerToast("Falha de rede ao excluir.", "error");
    }
  }

  const stTotal     = lista.length;
  const stAtivos    = lista.filter((p) => p.status === "ativo").length;
  const stEncerrado = lista.filter((p) => p.status !== "ativo").length;

  const listagem = lista.filter((p) => {
    if (busca && !p.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtro === "ativo"     && p.status !== "ativo") return false;
    if (filtro === "encerrado" && p.status === "ativo") return false;
    return true;
  });

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Processos</h1>
          <p style={s.sub}>
            Pasta de organização e permissão (parceiros/operadores).
            Conteúdo publicado continua nas páginas públicas já existentes do site.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/admin/acessos" style={{ ...s.btnGhost, textDecoration: "none" }}>
            Gerenciar acessos
          </Link>
          <button style={s.btnPrimario} onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? "Cancelar" : "+ Novo processo"}
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div style={s.formCard}>
          <h2 style={s.formTitulo}>Novo processo</h2>
          <div style={s.formGrid}>
            <label style={s.label}>
              Título *
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Cultura Viva 2026" style={s.input} />
            </label>
            <label style={s.label}>
              Tipo
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={s.input}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <label style={s.label}>
            Resumo (opcional)
            <textarea rows={2} value={resumo} onChange={(e) => setResumo(e.target.value)}
              style={s.textarea} placeholder="Breve descrição do processo" />
          </label>
          <div style={{ marginTop: 14 }}>
            <button style={s.btnPrimario} onClick={criar} disabled={salvando}>
              {salvando ? "Salvando..." : "Criar processo"}
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div style={s.aviso}><strong>Aviso:</strong> {msg}</div>
      )}

      {!loading && stTotal > 0 && (
        <div style={s.statsRow}>
          {([
            { key: "todos" as Filtro,     label: "Total",      valor: stTotal,     cor: "#94a3b8" },
            { key: "ativo" as Filtro,     label: "Ativos",     valor: stAtivos,    cor: "#86efac" },
            { key: "encerrado" as Filtro, label: "Encerrados", valor: stEncerrado, cor: "#fca5a5" },
          ]).map((st) => (
            <div
              key={st.key}
              onClick={() => setFiltro(filtro === st.key ? "todos" : st.key)}
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
          <input type="search" placeholder="Buscar por título..."
            value={busca} onChange={(e) => setBusca(e.target.value)} style={s.inputBusca} />
        </div>
      )}

      {loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : listagem.length === 0 ? (
        <p style={s.empty}>
          {stTotal === 0 ? "Nenhum processo cadastrado." : "Nenhum processo corresponde ao filtro."}
        </p>
      ) : (
        <div style={s.grid}>
          {listagem.map((p) => (
            <div key={p.id} style={s.card}>
              <div style={s.cardTop}>
                <span style={{ ...s.badge, ...(STATUS_ESTILO[p.status] ?? STATUS_ESTILO.encerrado) }}>
                  {p.status === "ativo" ? "Ativo" : "Encerrado"}
                </span>
                <span style={s.tipoChip}>{labelTipo(p.tipo)}</span>
              </div>
              <strong style={s.cardTitulo}>{p.titulo}</strong>
              {p.resumo && <p style={s.cardResumo}>{p.resumo}</p>}
              <div style={s.acoesRow}>
                {p.status === "ativo" && (
                  <button style={s.btnEncerrar} onClick={() => encerrar(p.id, p.titulo)}>
                    Encerrar
                  </button>
                )}
                <button style={s.btnDel} onClick={() => excluir(p.id, p.titulo)}>
                  Excluir
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
  wrap:       { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo:     { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:        { margin: "6px 0 0", color: "#94a3b8", fontSize: 13, maxWidth: 560 },
  formCard:   { background: "rgba(15,23,42,0.92)", border: "1px solid rgba(148,163,184,0.28)", borderRadius: 18, padding: 22, marginBottom: 20 },
  formTitulo: { margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: "#e0f2fe" },
  formGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 },
  label:      { fontSize: 13, fontWeight: 600, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 },
  input:      { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },
  textarea:   { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13, resize: "vertical", width: "100%" },
  aviso:      { marginBottom: 16, padding: "12px 16px", borderRadius: 10, border: "1px solid #f59e0b", background: "rgba(245,158,11,0.08)", fontSize: 13 },
  statsRow:   { display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 16 },
  statCard:   { flex: "1 1 120px", borderRadius: 14, padding: "12px 16px", cursor: "pointer" },
  statNum:    { fontSize: 24, fontWeight: 900, lineHeight: 1, marginBottom: 4 },
  statLabel:  { fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  inputBusca: { width: "100%", maxWidth: 340, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 },
  card:       { background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.14)", borderRadius: 16, padding: 18 },
  cardTop:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" as const },
  cardTitulo: { display: "block", fontSize: 15, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 },
  cardResumo: { fontSize: 13, color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 },
  acoesRow:   { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" as const },
  badge:      { display: "inline-flex", padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  tipoChip:   { fontSize: 11, color: "#64748b", background: "rgba(148,163,184,0.1)", padding: "3px 8px", borderRadius: 6 },
  btnPrimario:  { padding: "9px 18px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnGhost:     { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center" },
  btnEncerrar:  { padding: "5px 12px", borderRadius: 8, border: "1px solid #92400e", background: "rgba(180,83,9,0.18)", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnDel:       { padding: "5px 12px", borderRadius: 8, border: "1px solid #7f1d1d", background: "rgba(127,29,29,0.18)", color: "#fca5a5", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  empty:        { color: "#64748b", marginTop: 24, textAlign: "center" },
};
