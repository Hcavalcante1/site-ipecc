"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Alerta, NivelAlerta } from "@/app/api/admin/alertas/route";

type Resumo = { total: number; criticos: number; atencoes: number; info: number };

const NIVEL_ESTILO: Record<NivelAlerta, { borda: string; bg: string; cor: string; icon: string; label: string }> = {
  critico: { borda: "#dc2626", bg: "rgba(220,38,38,0.08)",  cor: "#fca5a5", icon: "🔴", label: "Crítico" },
  atencao: { borda: "#d97706", bg: "rgba(217,119,6,0.08)",  cor: "#fde047", icon: "🟡", label: "Atenção" },
  info:    { borda: "#1d4ed8", bg: "rgba(29,78,216,0.08)",  cor: "#93c5fd", icon: "🔵", label: "Informativo" },
};

const MODULO_ICONE: Record<string, string> = {
  LGPD:          "🔒",
  Propostas:     "📥",
  Editais:       "📋",
  Beneficiários: "👥",
  Plataforma:    "⚙️",
  Faturamento:   "💳",
};

const INTERVALO_REFRESH_MS = 5 * 60 * 1000; // 5 minutos

export default function AlertasPage() {
  const [alertas, setAlertas]   = useState<Alerta[]>([]);
  const [resumo, setResumo]     = useState<Resumo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [filtroNivel, setFiltroNivel] = useState<NivelAlerta | "">("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/alertas");
      const json = await res.json() as { alertas: Alerta[]; resumo: Resumo };
      setAlertas(json.alertas ?? []);
      setResumo(json.resumo ?? null);
      setUltimaAtualizacao(new Date());
    } catch {
      // sem-op
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    const timer = window.setInterval(() => void carregar(), INTERVALO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [carregar]);

  const exibidos = filtroNivel ? alertas.filter((a) => a.nivel === filtroNivel) : alertas;

  const criticos = alertas.filter((a) => a.nivel === "critico");
  const atencoes = alertas.filter((a) => a.nivel === "atencao");
  const infos    = alertas.filter((a) => a.nivel === "info");

  return (
    <div style={s.wrap}>
      {/* Cabeçalho */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Central de Alertas</h1>
          <p style={s.sub}>
            Itens que precisam de atenção em toda a plataforma — atualizado a cada 5 minutos.
            {ultimaAtualizacao && (
              <> Última consulta: {ultimaAtualizacao.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>
            )}
          </p>
        </div>
        <button style={s.btnRefresh} onClick={() => void carregar()} disabled={loading} title="Atualizar agora">
          {loading ? "⟳ Atualizando..." : "⟳ Atualizar"}
        </button>
      </div>

      {/* Summary cards */}
      {resumo && (
        <div style={s.summaryRow}>
          {[
            { nivel: "critico" as NivelAlerta, count: resumo.criticos,  label: "Críticos" },
            { nivel: "atencao" as NivelAlerta, count: resumo.atencoes,  label: "Atenção" },
            { nivel: "info"    as NivelAlerta, count: resumo.info,      label: "Informativos" },
          ].map(({ nivel, count, label }) => {
            const st = NIVEL_ESTILO[nivel];
            return (
              <button
                key={nivel}
                style={{
                  ...s.summaryCard,
                  borderColor: filtroNivel === nivel ? st.borda : "rgba(148,163,184,0.15)",
                  background:  filtroNivel === nivel ? st.bg     : "rgba(15,23,42,0.8)",
                  cursor: "pointer",
                }}
                onClick={() => setFiltroNivel(filtroNivel === nivel ? "" : nivel)}
              >
                <span style={{ fontSize: 22 }}>{st.icon}</span>
                <span style={{ ...s.summaryNum, color: count > 0 ? st.cor : "#334155" }}>{count}</span>
                <span style={s.summaryLabel}>{label}</span>
              </button>
            );
          })}
          {resumo.total === 0 && !loading && (
            <div style={s.tudoBem}>
              ✅ Nenhum alerta pendente. Plataforma em ordem.
            </div>
          )}
        </div>
      )}

      {loading && alertas.length === 0 ? (
        <p style={s.empty}>Verificando plataforma...</p>
      ) : (
        <>
          {filtroNivel && (
            <button
              type="button"
              style={s.limparFiltro}
              onClick={() => setFiltroNivel("")}
            >
              ✕ Mostrar todos os níveis
            </button>
          )}

          {exibidos.length === 0 ? (
            <p style={s.empty}>
              {filtroNivel
                ? `Nenhum alerta do nível "${NIVEL_ESTILO[filtroNivel].label}".`
                : "Nenhum alerta ativo no momento."}
            </p>
          ) : (
            <>
              {/* Críticos */}
              {criticos.length > 0 && (!filtroNivel || filtroNivel === "critico") && (
                <GrupoAlertas nivel="critico" alertas={criticos} />
              )}
              {/* Atenção */}
              {atencoes.length > 0 && (!filtroNivel || filtroNivel === "atencao") && (
                <GrupoAlertas nivel="atencao" alertas={atencoes} />
              )}
              {/* Info */}
              {infos.length > 0 && (!filtroNivel || filtroNivel === "info") && (
                <GrupoAlertas nivel="info" alertas={infos} />
              )}
            </>
          )}
        </>
      )}

      {/* Legenda */}
      <div style={s.legenda}>
        <strong style={{ color: "#475569" }}>Legenda de módulos:</strong>
        {Object.entries(MODULO_ICONE).map(([m, ic]) => (
          <span key={m} style={s.legendaItem}>{ic} {m}</span>
        ))}
      </div>
    </div>
  );
}

function GrupoAlertas({ nivel, alertas }: { nivel: NivelAlerta; alertas: Alerta[] }) {
  const st = NIVEL_ESTILO[nivel];
  return (
    <div style={s.grupo}>
      <div style={{ ...s.grupoHeader, color: st.cor, borderColor: st.borda }}>
        {st.icon} {st.label} — {alertas.length} item{alertas.length !== 1 ? "s" : ""}
      </div>
      <div style={s.grupoBody}>
        {alertas.map((a) => (
          <div key={a.id} style={{ ...s.alertaCard, borderLeftColor: st.borda }}>
            <div style={s.alertaTop}>
              <span style={s.alertaIcone}>{MODULO_ICONE[a.modulo] ?? "📌"}</span>
              <div style={s.alertaTexto}>
                <div style={{ ...s.alertaTitulo, color: st.cor }}>{a.titulo}</div>
                <div style={s.alertaDesc}>{a.descricao}</div>
              </div>
              <span style={{ ...s.moduloChip, borderColor: st.borda, color: st.cor }}>
                {a.modulo}
              </span>
            </div>
            <div style={s.alertaRodape}>
              <Link href={a.cta_href} style={{ ...s.btnCta, background: `${st.borda}22`, color: st.cor, border: `1px solid ${st.borda}44` }}>
                {a.cta_label} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap:         { padding: 24, color: "#e5e7eb", maxWidth: 900 },
  pageHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  titulo:       { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:          { margin: "6px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.5 },
  btnRefresh:   { padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  summaryRow:   { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "center" },
  summaryCard:  { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "14px 22px", borderRadius: 14, border: "1px solid", minWidth: 110, transition: "all 0.15s" },
  summaryNum:   { fontSize: 32, fontWeight: 900, lineHeight: 1 },
  summaryLabel: { fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  tudoBem:      { flex: 1, padding: "14px 20px", borderRadius: 12, background: "rgba(22,101,52,0.12)", border: "1px solid #166534", color: "#86efac", fontWeight: 700, fontSize: 14 },
  limparFiltro: { display: "inline-flex", marginBottom: 14, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.25)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  grupo:        { marginBottom: 20 },
  grupoHeader:  { fontSize: 12, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.08em", paddingBottom: 8, borderBottom: "1px solid", marginBottom: 10 },
  grupoBody:    { display: "flex", flexDirection: "column", gap: 8 },
  alertaCard:   { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.12)", borderLeft: "3px solid", borderRadius: "0 12px 12px 0", padding: "14px 18px" },
  alertaTop:    { display: "flex", gap: 12, alignItems: "flex-start" },
  alertaIcone:  { fontSize: 20, flexShrink: 0, marginTop: 1 },
  alertaTexto:  { flex: 1, minWidth: 0 },
  alertaTitulo: { fontSize: 14, fontWeight: 800, marginBottom: 3 },
  alertaDesc:   { fontSize: 12, color: "#64748b", lineHeight: 1.5 },
  moduloChip:   { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid", flexShrink: 0, alignSelf: "flex-start", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  alertaRodape: { display: "flex", justifyContent: "flex-end", marginTop: 10 },
  btnCta:       { padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center" },
  empty:        { color: "#475569", textAlign: "center" as const, padding: "40px 0" },
  legenda:      { marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "#334155", padding: "12px 16px", borderTop: "1px solid rgba(148,163,184,0.1)" },
  legendaItem:  { fontSize: 12, color: "#475569" },
};
