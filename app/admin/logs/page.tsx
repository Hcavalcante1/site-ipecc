"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { labelAcaoAdmin } from "@/lib/admin/acaoLabel";

type Log = {
  id: string;
  user_email: string | null;
  acao: string;
  tabela: string;
  detalhes: unknown;
  created_at: string;
};

type Stats = { acao: string; total: number }[];
type AtividadeDia = { dia: string; total: number };

const ACAO_COR: Record<string, { bg: string; text: string; borda: string }> = {
  INSERT: { bg: "rgba(22,101,52,0.28)",   text: "#86efac", borda: "#166534" },
  UPDATE: { bg: "rgba(29,78,216,0.22)",   text: "#93c5fd", borda: "#1e40af" },
  DELETE: { bg: "rgba(127,29,29,0.28)",   text: "#fca5a5", borda: "#7f1d1d" },
  SELECT: { bg: "rgba(100,116,139,0.18)", text: "#94a3b8", borda: "#334155" },
};

function corAcao(acao: string) {
  return ACAO_COR[acao] ?? ACAO_COR.SELECT;
}

const POR_PAGINA = 50;

export default function LogsPage() {
  const [logs, setLogs]         = useState<Log[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [loadingMais, setLoadingMais] = useState(false);
  const [stats, setStats]       = useState<Stats>([]);
  const [atividade, setAtividade] = useState<AtividadeDia[]>([]);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [novoCount, setNovoCount] = useState(0);

  // Filtros
  const [acao, setAcao]         = useState("");
  const [tabela, setTabela]     = useState("");
  const [busca, setBusca]       = useState("");
  const [inicio, setInicio]     = useState("");
  const [fim, setFim]           = useState("");
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buscaReal               = useRef("");

  const hoje           = new Date().toISOString().slice(0, 10);
  const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  function buildQuery(offset = 0) {
    let q = supabase
      .from("admin_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + POR_PAGINA - 1);

    if (acao)             q = q.eq("acao", acao);
    if (tabela.trim())    q = q.ilike("tabela", `%${tabela.trim()}%`);
    if (buscaReal.current.trim()) q = q.ilike("user_email", `%${buscaReal.current.trim()}%`);
    if (inicio)           q = q.gte("created_at", inicio);
    if (fim)              q = q.lte("created_at", fim + "T23:59:59");
    return q;
  }

  const carregar = useCallback(async () => {
    setLoading(true);
    setNovoCount(0);
    const { data, count, error } = await buildQuery(0);
    if (!error) {
      setLogs(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [acao, tabela, inicio, fim]); // eslint-disable-line react-hooks/exhaustive-deps

  async function carregarMais() {
    setLoadingMais(true);
    const { data } = await buildQuery(logs.length);
    if (data) setLogs((prev) => [...prev, ...data]);
    setLoadingMais(false);
  }

  async function carregarStats() {
    const trinta = new Date(Date.now() - 30 * 86400000).toISOString();

    const [statsRes, atividadeRes] = await Promise.all([
      supabase.from("admin_logs").select("acao").gte("created_at", trinta),
      supabase.from("admin_logs").select("created_at").gte("created_at", trinta).order("created_at"),
    ]);

    // Contagem por ação
    const contagem: Record<string, number> = {};
    for (const r of statsRes.data ?? []) {
      contagem[r.acao as string] = (contagem[r.acao as string] ?? 0) + 1;
    }
    setStats(Object.entries(contagem).map(([a, t]) => ({ acao: a, total: t })).sort((a, b) => b.total - a.total));

    // Atividade por dia (últimos 14 dias)
    const porDia: Record<string, number> = {};
    const quatorze = new Date(Date.now() - 14 * 86400000);
    for (const r of atividadeRes.data ?? []) {
      const d = (r.created_at as string).slice(0, 10);
      if (new Date(d) >= quatorze) {
        porDia[d] = (porDia[d] ?? 0) + 1;
      }
    }
    const dias: AtividadeDia[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dias.push({ dia: d, total: porDia[d] ?? 0 });
    }
    setAtividade(dias);
  }

  // Debounce na busca por email
  function handleBusca(v: string) {
    setBusca(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buscaReal.current = v;
      void carregar();
    }, 400);
  }

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { void carregarStats(); }, []);

  // Realtime — novos logs chegando
  useEffect(() => {
    const canal = supabase
      .channel("admin_logs_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_logs" }, () => {
        setNovoCount((n) => n + 1);
      })
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, []);

  function toggleExpand(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exportCSV() {
    if (logs.length === 0) return;
    const bom  = "﻿";
    const cabec = ["E-mail", "Ação", "Tabela", "Detalhes", "Data"];
    const linhas = logs.map((l) => [
      l.user_email ?? "",
      labelAcaoAdmin(l.acao),
      l.tabela,
      l.detalhes ? JSON.stringify(l.detalhes) : "",
      new Date(l.created_at).toLocaleString("pt-BR"),
    ].map((v) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
    const csv = bom + [cabec.join(","), ...linhas].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = `logs-${hoje}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const maxAtividade = Math.max(...atividade.map((d) => d.total), 1);

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Registros do sistema</h1>
          <p style={s.sub}>Auditoria de operações administrativas. Somente leitura e exportação.</p>
        </div>
        <button style={s.btnExport} onClick={exportCSV} disabled={logs.length === 0}>
          ⬇ Exportar CSV ({logs.length})
        </button>
      </div>

      {/* Stats últimos 30 dias */}
      {stats.length > 0 && (
        <div style={s.statsRow}>
          {stats.map((st) => {
            const cor = corAcao(st.acao);
            return (
              <div key={st.acao} style={{ ...s.statCard, borderColor: cor.borda }}>
                <span style={{ ...s.statBadge, background: cor.bg, color: cor.text, border: `1px solid ${cor.borda}` }}>
                  {labelAcaoAdmin(st.acao)}
                </span>
                <span style={{ ...s.statNum, color: cor.text }}>{st.total}</span>
                <span style={s.statLabel}>últimos 30 dias</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline de atividade — últimos 14 dias */}
      {atividade.some((d) => d.total > 0) && (
        <div style={s.timelineCard}>
          <div style={s.timelineTitulo}>Atividade — últimos 14 dias</div>
          <div style={s.timelineBars}>
            {atividade.map((d) => {
              const pct = (d.total / maxAtividade) * 100;
              const diaSemana = new Date(d.dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
              const diaNum    = d.dia.slice(8);
              return (
                <div key={d.dia} style={s.barCol} title={`${d.dia}: ${d.total} operação(ões)`}>
                  <div style={s.barWrap}>
                    <div style={{ ...s.barFill, height: `${Math.max(pct, d.total > 0 ? 4 : 0)}%`, background: d.total > 0 ? "#3b82f6" : "transparent" }} />
                  </div>
                  <div style={s.barDiaNum}>{diaNum}</div>
                  <div style={s.barDiaSem}>{diaSemana}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={s.filtrosCard}>
        <div style={s.filtrosGrid}>
          <select value={acao} onChange={(e) => setAcao(e.target.value)} style={s.select}>
            <option value="">Todas as ações</option>
            <option value="INSERT">Inclusão</option>
            <option value="UPDATE">Atualização</option>
            <option value="DELETE">Exclusão</option>
          </select>
          <input placeholder="Tabela" value={tabela} onChange={(e) => setTabela(e.target.value)} style={s.input} />
          <input placeholder="Buscar por usuário (e-mail)" value={busca} onChange={(e) => handleBusca(e.target.value)} style={s.input} />
          <label style={s.dateLabel}>
            De
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} style={s.inputDate} max={hoje} />
          </label>
          <label style={s.dateLabel}>
            Até
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} style={s.inputDate} max={hoje} />
          </label>
        </div>
        <div style={s.atalhoRow}>
          {[
            { l: "Hoje",         i: hoje,           f: hoje },
            { l: "Este mês",     i: primeiroDiaMes, f: hoje },
            { l: "Últimos 7d",   i: new Date(Date.now()-7*86400000).toISOString().slice(0,10), f: hoje },
            { l: "Últimos 30d",  i: new Date(Date.now()-30*86400000).toISOString().slice(0,10), f: hoje },
            { l: "Limpar",       i: "",              f: "" },
          ].map((a_) => (
            <button key={a_.l} type="button" style={s.atalho} onClick={() => { setInicio(a_.i); setFim(a_.f); }}>
              {a_.l}
            </button>
          ))}
        </div>
      </div>

      {/* Banner de novos logs */}
      {novoCount > 0 && (
        <button
          type="button"
          style={s.novoBanner}
          onClick={() => { void carregar(); void carregarStats(); }}
        >
          {novoCount} novo{novoCount > 1 ? "s" : ""} registro{novoCount > 1 ? "s" : ""} — clique para atualizar
        </button>
      )}

      {/* Resultado */}
      {loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : logs.length === 0 ? (
        <p style={s.empty}>Nenhum registro encontrado com os filtros atuais.</p>
      ) : (
        <>
          <p style={s.totalLabel}>{total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""} — exibindo {logs.length}</p>

          <div style={s.lista}>
            {logs.map((log) => {
              const cor = corAcao(log.acao);
              const expandido = expandidos.has(log.id);
              const temDetalhes = log.detalhes && Object.keys(log.detalhes as object).length > 0;
              const inicial = (log.user_email ?? "?")[0].toUpperCase();
              const diff    = Date.now() - new Date(log.created_at).getTime();
              const tempoRel = diff < 60000 ? "agora"
                : diff < 3600000 ? `${Math.floor(diff/60000)}min atrás`
                : diff < 86400000 ? `${Math.floor(diff/3600000)}h atrás`
                : new Date(log.created_at).toLocaleDateString("pt-BR");

              return (
                <div key={log.id} style={s.logCard}>
                  <div style={s.logTop}>
                    <div style={{ ...s.avatar, background: cor.bg, color: cor.text, border: `1px solid ${cor.borda}` }}>
                      {inicial}
                    </div>
                    <div style={s.logInfo}>
                      <div style={s.logEmail}>{log.user_email ?? "sistema"}</div>
                      <div style={s.logMeta}>
                        <span style={{ ...s.acaoBadge, background: cor.bg, color: cor.text, border: `1px solid ${cor.borda}` }}>
                          {labelAcaoAdmin(log.acao)}
                        </span>
                        <span style={s.tabelaChip}>{log.tabela}</span>
                        <span style={s.tempo} title={new Date(log.created_at).toLocaleString("pt-BR")}>
                          {tempoRel}
                        </span>
                      </div>
                    </div>
                    {temDetalhes && (
                      <button
                        type="button"
                        style={s.expandBtn}
                        onClick={() => toggleExpand(log.id)}
                        aria-label="Ver detalhes"
                      >
                        {expandido ? "▲" : "▼"} detalhes
                      </button>
                    )}
                  </div>

                  {expandido && temDetalhes && (
                    <pre style={s.detalhes}>
                      {JSON.stringify(log.detalhes, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>

          {logs.length < total && (
            <button
              type="button"
              style={s.btnMais}
              onClick={() => void carregarMais()}
              disabled={loadingMais}
            >
              {loadingMais ? "Carregando..." : `Carregar mais (${total - logs.length} restantes)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap:         { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo:       { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:          { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  btnExport:    { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  statsRow:     { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 },
  statCard:     { background: "rgba(15,23,42,0.8)", border: "1px solid", borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, minWidth: 130 },
  statBadge:    { display: "inline-flex", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, alignSelf: "flex-start" },
  statNum:      { fontSize: 28, fontWeight: 900, lineHeight: 1 },
  statLabel:    { fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase" as const },
  timelineCard: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 14, padding: "16px 20px", marginBottom: 16 },
  timelineTitulo: { fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12 },
  timelineBars: { display: "flex", gap: 6, alignItems: "flex-end", height: 70 },
  barCol:       { display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 3 },
  barWrap:      { flex: 1, width: "100%", display: "flex", alignItems: "flex-end", background: "rgba(148,163,184,0.08)", borderRadius: 4, overflow: "hidden", minHeight: 40 },
  barFill:      { width: "100%", borderRadius: 4, transition: "height 0.5s ease" },
  barDiaNum:    { fontSize: 10, color: "#64748b", fontWeight: 700, lineHeight: 1 },
  barDiaSem:    { fontSize: 9, color: "#334155", lineHeight: 1 },
  filtrosCard:  { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 14, padding: "16px 20px", marginBottom: 16 },
  filtrosGrid:  { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 },
  select:       { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  input:        { flex: "1 1 160px", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  dateLabel:    { fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 },
  inputDate:    { padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  atalhoRow:    { display: "flex", gap: 6, flexWrap: "wrap" },
  atalho:       { padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  novoBanner:   { display: "block", width: "100%", padding: "10px 0", marginBottom: 12, borderRadius: 10, border: "1px solid #1e40af", background: "rgba(29,78,216,0.15)", color: "#93c5fd", fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "center" as const },
  totalLabel:   { fontSize: 12, color: "#475569", marginBottom: 10 },
  lista:        { display: "flex", flexDirection: "column", gap: 6 },
  logCard:      { background: "rgba(15,23,42,0.7)", border: "1px solid rgba(148,163,184,0.1)", borderRadius: 12, padding: "12px 16px" },
  logTop:       { display: "flex", gap: 12, alignItems: "flex-start" },
  avatar:       { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, flexShrink: 0 },
  logInfo:      { flex: 1, minWidth: 0 },
  logEmail:     { fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  logMeta:      { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" as const },
  acaoBadge:    { display: "inline-flex", padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 800 },
  tabelaChip:   { fontSize: 11, color: "#64748b", background: "rgba(148,163,184,0.1)", padding: "2px 7px", borderRadius: 6, fontFamily: "monospace" },
  tempo:        { fontSize: 11, color: "#334155" },
  expandBtn:    { padding: "3px 10px", borderRadius: 7, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  detalhes:     { marginTop: 12, background: "rgba(2,6,23,0.7)", border: "1px solid rgba(148,163,184,0.1)", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#64748b", overflowX: "auto" as const, maxHeight: 240, overflowY: "auto" as const },
  empty:        { color: "#475569", textAlign: "center" as const, padding: "40px 0" },
  btnMais:      { display: "block", width: "100%", marginTop: 14, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "center" as const },
};
