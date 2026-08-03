"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CheckStatus = "ok" | "aviso" | "erro";

type Check = {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string;
  status: CheckStatus;
  valor?: string;
};

type Resumo = { total: number; oks: number; avisos: number; erros: number; pontuacao: number };

const STATUS_COR: Record<CheckStatus, React.CSSProperties> = {
  ok:    { background: "rgba(22,101,52,0.25)",  color: "#86efac", border: "1px solid #166534" },
  aviso: { background: "rgba(180,130,0,0.22)",  color: "#fde047", border: "1px solid #a16207" },
  erro:  { background: "rgba(127,29,29,0.28)",  color: "#fca5a5", border: "1px solid #7f1d1d" },
};

const STATUS_ICON: Record<CheckStatus, string> = {
  ok:    "✓",
  aviso: "⚠",
  erro:  "✗",
};

const CATEGORIA_ORDEM = ["Infraestrutura", "Banco de dados", "Segurança", "Organização", "Usuários", "Integrações"];

export default function DiagnosticoPage() {
  const [checks, setChecks]   = useState<Check[]>([]);
  const [resumo, setResumo]   = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [executadoEm, setExecutadoEm] = useState<Date | null>(null);
  const [filtro, setFiltro]   = useState<CheckStatus | "todos">("todos");

  const executar = useCallback(async () => {
    setLoading(true);
    setChecks([]);
    setResumo(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res  = await fetch("/api/admin/diagnostico", { headers });
      const json = (await res.json()) as { ok: boolean; checks?: Check[]; resumo?: Resumo };
      if (json.ok) {
        setChecks(json.checks ?? []);
        setResumo(json.resumo ?? null);
        setExecutadoEm(new Date());
      }
    } catch {
      // silencioso — mostra estado vazio
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void executar(); }, [executar]);

  const categorias = CATEGORIA_ORDEM.filter((cat) =>
    checks.some((c) => c.categoria === cat)
  );

  const checksFiltrados = filtro === "todos" ? checks : checks.filter((c) => c.status === filtro);

  const pontuacaoCor =
    !resumo       ? "#64748b"
    : resumo.pontuacao >= 90 ? "#86efac"
    : resumo.pontuacao >= 70 ? "#fde047"
    : "#fca5a5";

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Diagnóstico da plataforma</h1>
          <p style={s.sub}>
            Verifica a configuração, integrações e segurança do sistema.
            {executadoEm && (
              <span style={{ color: "#475569" }}>
                {" "}· Executado às {executadoEm.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </p>
        </div>
        <button
          style={{ ...s.btnPrimario, opacity: loading ? 0.7 : 1 }}
          onClick={() => void executar()}
          disabled={loading}
        >
          {loading ? "Verificando..." : "Re-executar diagnóstico"}
        </button>
      </div>

      {/* Painel de resumo */}
      {resumo && (
        <div style={s.resumoBanner}>
          <div style={s.pontuacaoWrap}>
            <div style={{ ...s.pontuacao, color: pontuacaoCor }}>{resumo.pontuacao}%</div>
            <div style={s.pontuacaoLabel}>Saúde geral</div>
          </div>
          <div style={s.resumoStats}>
            {[
              { label: "Verificações",   valor: resumo.total,  cor: "#e2e8f0" },
              { label: "OK",             valor: resumo.oks,    cor: "#86efac" },
              { label: "Avisos",         valor: resumo.avisos, cor: "#fde047" },
              { label: "Erros críticos", valor: resumo.erros,  cor: "#fca5a5" },
            ].map((s_) => (
              <div key={s_.label} style={s.resumoStat}>
                <span style={{ ...s.resumoValor, color: s_.cor }}>{s_.valor}</span>
                <span style={s.resumoLabel}>{s_.label}</span>
              </div>
            ))}
          </div>
          <div style={s.pontuacaoBar}>
            <div style={{ ...s.pontuacaoBarFill, width: `${resumo.pontuacao}%`, background: pontuacaoCor }} />
          </div>
        </div>
      )}

      {/* Filtros */}
      {!loading && checks.length > 0 && (
        <div style={s.filtroRow}>
          {(["todos", "erro", "aviso", "ok"] as const).map((f) => (
            <button
              key={f}
              style={{
                ...s.filtroBtn,
                ...(filtro === f ? s.filtroBtnAtivo : {}),
                ...(f === "erro" && filtro === f ? { borderColor: "#7f1d1d", color: "#fca5a5" } : {}),
                ...(f === "aviso" && filtro === f ? { borderColor: "#a16207", color: "#fde047" } : {}),
                ...(f === "ok" && filtro === f ? { borderColor: "#166534", color: "#86efac" } : {}),
              }}
              onClick={() => setFiltro(f)}
            >
              {f === "todos" ? "Todos"
                : f === "erro" ? `✗ Erros (${resumo?.erros ?? 0})`
                : f === "aviso" ? `⚠ Avisos (${resumo?.avisos ?? 0})`
                : `✓ OK (${resumo?.oks ?? 0})`}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div style={s.loadingBox}>
          <div style={s.loadingDots}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ ...s.dot, animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p style={s.loadingText}>Executando verificações...</p>
        </div>
      )}

      {/* Checks por categoria */}
      {!loading && categorias.map((categoria) => {
        const lista = checksFiltrados.filter((c) => c.categoria === categoria);
        if (lista.length === 0) return null;
        const temErro  = lista.some((c) => c.status === "erro");
        const temAviso = lista.some((c) => c.status === "aviso");
        const catStatus = temErro ? "erro" : temAviso ? "aviso" : "ok";
        return (
          <div key={categoria} style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitulo}>{categoria}</h2>
              <span style={{ ...s.catBadge, ...STATUS_COR[catStatus] }}>
                {STATUS_ICON[catStatus]} {catStatus === "ok" ? "Tudo ok" : catStatus === "aviso" ? "Atenção" : "Problema"}
              </span>
            </div>
            <div style={s.checkList}>
              {lista.map((check) => (
                <div key={check.id} style={s.checkRow}>
                  <div style={{ ...s.checkIcon, ...STATUS_COR[check.status] }}>
                    {STATUS_ICON[check.status]}
                  </div>
                  <div style={s.checkInfo}>
                    <div style={s.checkTitulo}>{check.titulo}</div>
                    <div style={s.checkDesc}>{check.descricao}</div>
                  </div>
                  {check.valor && (
                    <div style={{ ...s.checkValor, ...(check.status !== "ok" ? { color: STATUS_COR[check.status].color } : {}) }}>
                      {check.valor}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!loading && checks.length === 0 && (
        <div style={s.card}>
          <p style={{ color: "#64748b", textAlign: "center" as const }}>Nenhuma verificação disponível.</p>
        </div>
      )}

      <p style={s.nota}>
        O diagnóstico é executado com permissões de service role — dados sensíveis não são exibidos.
        Execute periodicamente para monitorar a saúde da plataforma.
      </p>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap:          { padding: 24, color: "#e5e7eb", maxWidth: 1000 },
  pageHeader:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  titulo:        { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:           { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  btnPrimario:   { padding: "10px 20px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  resumoBanner:  { background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 16, padding: "24px 28px", marginBottom: 20, display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px 32px", alignItems: "center" },
  pontuacaoWrap: { textAlign: "center" as const },
  pontuacao:     { fontSize: 52, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  pontuacaoLabel:{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginTop: 4 },
  resumoStats:   { display: "flex", gap: 24, flexWrap: "wrap" as const },
  resumoStat:    { display: "flex", flexDirection: "column", gap: 2 },
  resumoValor:   { fontSize: 28, fontWeight: 900 },
  resumoLabel:   { fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  pontuacaoBar:  { gridColumn: "1 / -1", height: 6, background: "rgba(148,163,184,0.15)", borderRadius: 999, overflow: "hidden" },
  pontuacaoBarFill: { height: "100%", borderRadius: 999, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" },
  filtroRow:     { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  filtroBtn:     { padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.25)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  filtroBtnAtivo:{ background: "rgba(148,163,184,0.1)", color: "#e2e8f0", borderColor: "rgba(148,163,184,0.4)" },
  loadingBox:    { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "60px 0" },
  loadingDots:   { display: "flex", gap: 8 },
  dot:           { width: 10, height: 10, borderRadius: "50%", background: "#1d4ed8", animation: "pulse 1s ease-in-out infinite" },
  loadingText:   { color: "#64748b", fontSize: 14 },
  card:          { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "20px 24px", marginBottom: 16 },
  cardHeader:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitulo:    { margin: 0, fontSize: 14, fontWeight: 800, color: "#f1f5f9" },
  catBadge:      { display: "inline-flex", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  checkList:     { display: "flex", flexDirection: "column", gap: 8 },
  checkRow:      { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(148,163,184,0.04)", border: "1px solid rgba(148,163,184,0.08)" },
  checkIcon:     { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, flexShrink: 0 },
  checkInfo:     { flex: 1, minWidth: 0 },
  checkTitulo:   { fontSize: 13, fontWeight: 700, color: "#e2e8f0" },
  checkDesc:     { fontSize: 12, color: "#475569", marginTop: 2 },
  checkValor:    { fontSize: 12, fontWeight: 700, color: "#64748b", whiteSpace: "nowrap" as const, fontFamily: "monospace" },
  nota:          { fontSize: 12, color: "#334155", marginTop: 8 },
};
