"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { triggerToast } from "@/components/AdminToast";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

// ─── Types ───────────────────────────────────────────────────────────────────

type Evento = {
  id: string;
  titulo: string;
  descricao: string;
  data_evento: string;
  local: string;
  horario?: string | null;
  whatsapp?: string | null;
  publicado: boolean;
  processo_id?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function dataPassada(iso: string): boolean {
  return new Date(iso) < new Date();
}

function diasAte(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EventosAdminPage() {
  const escopo = useAdminEscopoCliente();

  const [todos, setTodos]               = useState<Evento[]>([]);
  const [loading, setLoading]           = useState(true);
  const [excluindoId, setExcluindoId]   = useState<string | null>(null);
  const [togglendoId, setTogglendoId]   = useState<string | null>(null);

  // Filtros
  const [busca, setBusca]               = useState("");
  const buscaReal                       = useRef("");
  const buscaTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<"" | "publicado" | "rascunho">("");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"" | "proximos" | "passados">("");

  // ── Loader ──────────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    if (escopo.loading) return;
    setLoading(true);
    const { data } = await supabase
      .from("eventos")
      .select("*")
      .order("data_evento", { ascending: true });

    const lista = ((data ?? []) as Evento[]).filter((e) =>
      registroNoEscopoProcesso(e.processo_id, escopo.processoIds)
    );
    setTodos(lista);
    setLoading(false);
  }, [escopo.loading, escopo.processoIds]);

  useEffect(() => { void carregar(); }, [carregar]);

  // ── Filtros client-side ─────────────────────────────────────────────────

  const exibidos = todos.filter((e) => {
    if (filtroStatus === "publicado" && !e.publicado)  return false;
    if (filtroStatus === "rascunho"  &&  e.publicado)  return false;
    if (filtroPeriodo === "proximos" &&  dataPassada(e.data_evento)) return false;
    if (filtroPeriodo === "passados" && !dataPassada(e.data_evento)) return false;
    const q = buscaReal.current.toLowerCase();
    if (!q) return true;
    return (
      e.titulo?.toLowerCase().includes(q) ||
      e.local?.toLowerCase().includes(q) ||
      e.descricao?.toLowerCase().includes(q)
    );
  });

  // ── Stats ───────────────────────────────────────────────────────────────

  const total      = todos.length;
  const publicados = todos.filter((e) => e.publicado).length;
  const proximos   = todos.filter((e) => !dataPassada(e.data_evento)).length;
  const passados   = todos.filter((e) =>  dataPassada(e.data_evento)).length;

  // ── Busca debounced ─────────────────────────────────────────────────────

  function onBuscaChange(v: string) {
    setBusca(v);
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(() => { buscaReal.current = v; setBusca(v); }, 300);
  }

  // ── Toggle publicado ────────────────────────────────────────────────────

  async function togglePublicado(evento: Evento) {
    setTogglendoId(evento.id);
    const novoValor = !evento.publicado;
    const { error } = await supabase
      .from("eventos")
      .update({ publicado: novoValor })
      .eq("id", evento.id);

    if (error) {
      triggerToast(`Erro ao ${novoValor ? "publicar" : "despublicar"}: ${error.message}`, "error");
    } else {
      triggerToast(novoValor ? "Evento publicado." : "Evento movido para rascunho.", "success");
      setTodos((prev) => prev.map((e) => e.id === evento.id ? { ...e, publicado: novoValor } : e));
    }
    setTogglendoId(null);
  }

  // ── Excluir ─────────────────────────────────────────────────────────────

  async function excluir(evento: Evento) {
    const confirmado = await confirmAction(
      `Excluir o evento "${evento.titulo}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmado) {
      if (!isConfirmModalReady()) {
        if (!window.confirm(`Excluir o evento "${evento.titulo}"?`)) return;
      } else return;
    }

    setExcluindoId(evento.id);
    const { error } = await supabase.from("eventos").delete().eq("id", evento.id);
    if (error) {
      triggerToast(`Erro ao excluir: ${error.message}`, "error");
    } else {
      triggerToast("Evento excluído.", "success");
      setTodos((prev) => prev.filter((e) => e.id !== evento.id));
    }
    setExcluindoId(null);
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (escopo.loading || loading) {
    return <p style={s.empty}>Carregando eventos…</p>;
  }

  return (
    <div style={s.wrap}>
      {/* Cabeçalho */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Eventos</h1>
          <p style={s.sub}>
            Gerencie a agenda institucional exibida em /eventos e nos blocos públicos.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          <button style={s.btnRefresh} onClick={() => void carregar()} disabled={loading}>
            {loading ? "⟳ Atualizando…" : "⟳ Atualizar"}
          </button>
          <Link href="/admin/eventos/form" style={s.btnNovo}>
            + Novo evento
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label: "Total",      valor: total,      cor: "#94a3b8", filtro: "" as const },
          { label: "Publicados", valor: publicados, cor: "#86efac", filtro: "publicado" as const },
          { label: "Próximos",   valor: proximos,   cor: "#93c5fd", filtro: "proximos" as const },
          { label: "Passados",   valor: passados,   cor: "#475569", filtro: "passados" as const },
        ].map((st) => (
          <button
            key={st.label}
            style={{
              ...s.statCard,
              borderColor: (filtroStatus === st.filtro || filtroPeriodo === (st.filtro === "proximos" || st.filtro === "passados" ? st.filtro : ""))
                ? st.cor + "66" : "rgba(148,163,184,0.12)",
              cursor: "pointer",
            }}
            onClick={() => {
              if (st.filtro === "publicado") {
                setFiltroStatus(filtroStatus === "publicado" ? "" : "publicado");
              } else if (st.filtro === "proximos" || st.filtro === "passados") {
                setFiltroPeriodo(filtroPeriodo === st.filtro ? "" : st.filtro);
              } else {
                setFiltroStatus(""); setFiltroPeriodo("");
              }
            }}
          >
            <div style={{ ...s.statNum, color: st.cor }}>{st.valor}</div>
            <div style={s.statLabel}>{st.label}</div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={s.filtrosWrap}>
        <input
          placeholder="Buscar título, local ou descrição…"
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          style={s.inputFiltro}
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as "" | "publicado" | "rascunho")}
          style={s.selectFiltro}
        >
          <option value="">Publicado e rascunho</option>
          <option value="publicado">Somente publicados</option>
          <option value="rascunho">Somente rascunhos</option>
        </select>
        <select
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value as "" | "proximos" | "passados")}
          style={s.selectFiltro}
        >
          <option value="">Todos os períodos</option>
          <option value="proximos">Próximos</option>
          <option value="passados">Passados</option>
        </select>
        {(busca || filtroStatus || filtroPeriodo) && (
          <button style={s.btnLimpar} onClick={() => { setBusca(""); buscaReal.current = ""; setFiltroStatus(""); setFiltroPeriodo(""); }}>
            ✕ Limpar
          </button>
        )}
        <span style={s.contagem}>{exibidos.length} de {total}</span>
      </div>

      {/* Lista */}
      {exibidos.length === 0 ? (
        <p style={s.empty}>
          {total === 0 ? "Nenhum evento cadastrado ainda." : "Nenhum evento com os filtros aplicados."}
        </p>
      ) : (
        <div style={s.grid}>
          {exibidos.map((e) => {
            const passado  = dataPassada(e.data_evento);
            const dias     = diasAte(e.data_evento);
            const isExcl   = excluindoId === e.id;
            const isToggle = togglendoId === e.id;

            return (
              <div key={e.id} style={{
                ...s.card,
                opacity: passado ? 0.75 : 1,
                borderColor: e.publicado
                  ? passado ? "#16653422" : "#166534aa"
                  : "rgba(148,163,184,0.12)",
              }}>
                {/* Topo: data + status */}
                <div style={s.cardTop}>
                  <div style={s.dataBloco}>
                    <div style={s.dataGrande}>
                      {new Date(e.data_evento).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </div>
                    <div style={s.dataAno}>
                      {new Date(e.data_evento).getFullYear()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.eventoTitulo}>{e.titulo}</div>
                    <div style={s.eventoMeta}>
                      {e.horario && <span>⏰ {e.horario}</span>}
                      <span>📍 {e.local || "Local não informado"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{
                      ...s.statusChip,
                      color:      e.publicado ? "#86efac" : "#94a3b8",
                      background: e.publicado ? "rgba(22,101,52,0.18)" : "rgba(71,85,105,0.18)",
                      border:     `1px solid ${e.publicado ? "#16653466" : "#47556966"}`,
                    }}>
                      {e.publicado ? "Publicado" : "Rascunho"}
                    </span>
                    {!passado && (
                      <span style={s.diasChip}>
                        {dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias}d`}
                      </span>
                    )}
                    {passado && (
                      <span style={{ ...s.diasChip, color: "#334155" }}>encerrado</span>
                    )}
                  </div>
                </div>

                {/* Descrição */}
                {e.descricao && (
                  <p style={s.desc}>
                    {e.descricao.length > 120 ? `${e.descricao.slice(0, 120)}…` : e.descricao}
                  </p>
                )}

                {/* WhatsApp link */}
                {e.whatsapp && (
                  <div style={s.waLink}>💬 {e.whatsapp}</div>
                )}

                {/* Ações */}
                <div style={s.acoes}>
                  <Link href={`/admin/eventos/form?id=${e.id}`} style={s.btnEditar}>
                    Editar
                  </Link>
                  <button
                    style={{
                      ...s.btnToggle,
                      color:      e.publicado ? "#fca5a5" : "#86efac",
                      borderColor: e.publicado ? "#7f1d1d44" : "#16653444",
                    }}
                    disabled={isToggle}
                    onClick={() => void togglePublicado(e)}
                  >
                    {isToggle ? "…" : e.publicado ? "Despublicar" : "Publicar"}
                  </button>
                  <button
                    style={{ ...s.btnExcluir, opacity: isExcl ? 0.6 : 1 }}
                    disabled={isExcl}
                    onClick={() => void excluir(e)}
                  >
                    {isExcl ? "Excluindo…" : "Excluir"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap:         { padding: 24, color: "#e5e7eb", maxWidth: 1000 },
  pageHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo:       { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:          { margin: "6px 0 0", color: "#64748b", fontSize: 13 },
  btnRefresh:   { padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnNovo:      { padding: "9px 18px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center" },

  statsRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
  statCard: { flex: "1 1 130px", background: "rgba(15,23,42,0.85)", border: "1px solid", borderRadius: 14, padding: "14px 18px", textAlign: "left" as const },
  statNum:  { fontSize: 28, fontWeight: 900, lineHeight: 1, marginBottom: 4 },
  statLabel:{ fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },

  filtrosWrap: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" },
  inputFiltro: { flex: "1 1 220px", padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  selectFiltro:{ flex: "0 0 auto", padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(2,6,23,0.9)", color: "#e2e8f0", fontSize: 13 },
  btnLimpar:   { padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  contagem:    { fontSize: 12, color: "#334155", alignSelf: "center" as const },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 },
  card: { background: "rgba(15,23,42,0.85)", border: "1px solid", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, transition: "opacity 0.15s" },

  cardTop:     { display: "flex", gap: 12, alignItems: "flex-start" },
  dataBloco:   { background: "rgba(29,78,216,0.15)", border: "1px solid rgba(29,78,216,0.3)", borderRadius: 10, padding: "8px 12px", textAlign: "center" as const, flexShrink: 0 },
  dataGrande:  { fontSize: 15, fontWeight: 900, color: "#93c5fd", lineHeight: 1, textTransform: "capitalize" as const },
  dataAno:     { fontSize: 11, color: "#475569", marginTop: 2 },
  eventoTitulo:{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", marginBottom: 4, lineHeight: 1.3 },
  eventoMeta:  { display: "flex", flexDirection: "column", gap: 2, fontSize: 12, color: "#64748b" },
  statusChip:  { fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  diasChip:    { fontSize: 11, color: "#93c5fd", fontWeight: 600 },

  desc:   { fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: 0 },
  waLink: { fontSize: 12, color: "#86efac", background: "rgba(22,101,52,0.1)", borderRadius: 7, padding: "4px 10px" },

  acoes:      { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 },
  btnEditar:  { padding: "7px 14px", borderRadius: 9, background: "rgba(29,78,216,0.15)", border: "1px solid rgba(29,78,216,0.35)", color: "#93c5fd", fontWeight: 700, fontSize: 12, textDecoration: "none", display: "inline-flex" },
  btnToggle:  { padding: "7px 14px", borderRadius: 9, background: "transparent", border: "1px solid", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  btnExcluir: { padding: "7px 14px", borderRadius: 9, background: "rgba(127,29,29,0.15)", border: "1px solid rgba(127,29,29,0.35)", color: "#fca5a5", fontWeight: 700, fontSize: 12, cursor: "pointer" },

  empty: { color: "#475569", textAlign: "center" as const, padding: "40px 0" },
};
