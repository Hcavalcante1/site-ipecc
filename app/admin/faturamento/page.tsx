"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type UsageMetric = { label: string; valor: number; limite: number | null; cor: string };
type FaturaSimulada = { mes: string; valor: string; status: "pago" | "pendente" | "futuro" };

const PLANOS_LIMITES: Record<string, Record<string, number | null>> = {
  gratuito:     { editais: 3, propostas: 50, beneficiarios: 0, api_tokens: 0, portal_tokens: 1, usuarios: 1 },
  starter:      { editais: 20, propostas: 500, beneficiarios: 500, api_tokens: 0, portal_tokens: 10, usuarios: 5 },
  profissional: { editais: null, propostas: null, beneficiarios: null, api_tokens: 5, portal_tokens: 50, usuarios: 20 },
  enterprise:   { editais: null, propostas: null, beneficiarios: null, api_tokens: null, portal_tokens: null, usuarios: null },
};

const PRECO_PLANOS: Record<string, string> = {
  gratuito: "R$ 0,00",
  starter: "R$ 190,00",
  profissional: "R$ 490,00",
  enterprise: "Sob consulta",
};

export default function FaturamentoPage() {
  const [org, setOrg] = useState<{ id: string; nome: string; plano: string; created_at: string } | null>(null);
  const [metricas, setMetricas] = useState<UsageMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);

    const { data: orgData } = await supabase
      .from("organizacoes")
      .select("id, nome, plano, created_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!orgData) { setLoading(false); return; }
    setOrg(orgData as typeof org);

    const limites = PLANOS_LIMITES[orgData.plano] ?? PLANOS_LIMITES.gratuito;

    const [
      { count: editais },
      { count: propostas },
      { count: beneficiarios },
      { count: portalTokens },
      { count: apiTokens },
    ] = await Promise.all([
      supabase.from("editais").select("id", { count: "exact", head: true }).eq("org_id", orgData.id),
      supabase.from("propostas").select("id", { count: "exact", head: true }).eq("org_id", orgData.id),
      supabase.from("beneficiarios").select("id", { count: "exact", head: true }),
      supabase.from("portal_tokens").select("id", { count: "exact", head: true }),
      supabase.from("api_tokens").select("id", { count: "exact", head: true }),
    ]);

    setMetricas([
      { label: "Editais publicados",     valor: editais ?? 0,       limite: limites.editais,       cor: "#38bdf8" },
      { label: "Propostas recebidas",    valor: propostas ?? 0,     limite: limites.propostas,     cor: "#a78bfa" },
      { label: "Beneficiários",          valor: beneficiarios ?? 0, limite: limites.beneficiarios, cor: "#86efac" },
      { label: "Portal tokens",          valor: portalTokens ?? 0,  limite: limites.portal_tokens, cor: "#fde047" },
      { label: "API tokens",             valor: apiTokens ?? 0,     limite: limites.api_tokens,    cor: "#fb923c" },
    ]);

    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  // Simula histórico de faturas baseado na data de criação
  const faturas: FaturaSimulada[] = org ? gerarFaturas(org.created_at, org.plano) : [];

  if (loading) return <div style={s.wrap}><p style={s.empty}>Carregando...</p></div>;
  if (!org) return <div style={s.wrap}><p style={s.empty}>Organização não encontrada.</p></div>;

  const proximaRenovacao = new Date();
  proximaRenovacao.setMonth(proximaRenovacao.getMonth() + 1);
  proximaRenovacao.setDate(1);

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Faturamento e Uso</h1>
          <p style={s.sub}>Consumo atual, plano contratado e histórico de faturas.</p>
        </div>
        <Link href="/admin/organizacao" style={s.btnGhost}>
          Gerenciar plano →
        </Link>
      </div>

      {/* Plano atual */}
      <div style={s.planoBanner}>
        <div>
          <p style={s.planoBannerLabel}>Plano atual</p>
          <p style={s.planoBannerNome}>{org.plano.charAt(0).toUpperCase() + org.plano.slice(1)}</p>
          <p style={s.planoBannerPreco}>{PRECO_PLANOS[org.plano] ?? "—"}/mês</p>
        </div>
        <div style={s.planoBannerRight}>
          <p style={s.planoBannerLabel}>Próxima renovação</p>
          <p style={s.planoBannerData}>{proximaRenovacao.toLocaleDateString("pt-BR")}</p>
          {org.plano !== "enterprise" && (
            <Link href="/admin/organizacao" style={s.btnUpgrade}>
              Fazer upgrade
            </Link>
          )}
        </div>
      </div>

      {/* Métricas de uso */}
      <div style={s.card}>
        <h2 style={s.cardTitulo}>Uso do período atual</h2>
        <div style={s.metricasGrid}>
          {metricas.map((m) => {
            const pct = m.limite ? Math.min((m.valor / m.limite) * 100, 100) : 0;
            const alerta = m.limite && pct >= 80;
            return (
              <div key={m.label} style={s.metricaCard}>
                <div style={s.metricaHeader}>
                  <span style={s.metricaLabel}>{m.label}</span>
                  <span style={{ ...s.metricaValor, color: m.cor }}>{m.valor}</span>
                </div>
                {m.limite !== null ? (
                  <>
                    <div style={s.barBg}>
                      <div style={{
                        ...s.barFill,
                        width: `${pct}%`,
                        background: alerta ? "#f59e0b" : m.cor,
                      }} />
                    </div>
                    <div style={s.barLabel}>
                      {m.valor} / {m.limite} {alerta && <span style={s.alertaTag}>⚠ Próximo do limite</span>}
                    </div>
                  </>
                ) : (
                  <div style={s.ilimitadoTag}>Ilimitado</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico de faturas */}
      <div style={s.card}>
        <h2 style={s.cardTitulo}>Histórico de faturas</h2>
        {faturas.length === 0 || org.plano === "gratuito" ? (
          <p style={s.faturaVazio}>
            {org.plano === "gratuito"
              ? "Plano gratuito não gera faturas."
              : "Nenhuma fatura disponível ainda."}
          </p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Período", "Valor", "Status", ""].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {faturas.map((f, i) => (
                  <tr key={f.mes} style={i % 2 ? s.trAlt : s.tr}>
                    <td style={s.td}>{f.mes}</td>
                    <td style={s.td}>{f.valor}</td>
                    <td style={s.td}>
                      <span style={{ ...s.statusBadge, ...statusCor(f.status) }}>
                        {f.status === "pago" ? "Pago" : f.status === "pendente" ? "Pendente" : "Futuro"}
                      </span>
                    </td>
                    <td style={s.td}>
                      {f.status !== "futuro" && (
                        <button style={s.btnDownload} disabled title="Em breve: download do recibo">
                          Recibo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={s.faturaNota}>
          Integração com gateway de pagamento em breve. Faturas serão geradas automaticamente após a ativação do billing.
        </p>
      </div>
    </div>
  );
}

function gerarFaturas(createdAt: string, plano: string): FaturaSimulada[] {
  if (plano === "gratuito") return [];
  const preco = PRECO_PLANOS[plano] ?? "R$ 0,00";
  const inicio = new Date(createdAt);
  const hoje = new Date();
  const faturas: FaturaSimulada[] = [];
  const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  while (cur <= hoje && faturas.length < 12) {
    const mes = cur.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const passado = cur < hoje;
    faturas.push({ mes, valor: preco, status: passado ? "pago" : "pendente" });
    cur.setMonth(cur.getMonth() + 1);
  }
  // próximo mês como futuro
  const proximo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  faturas.push({
    mes: proximo.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    valor: preco,
    status: "futuro",
  });
  return faturas.reverse();
}

function statusCor(status: string): React.CSSProperties {
  if (status === "pago") return { background: "rgba(22,101,52,0.28)", color: "#86efac", border: "1px solid #166534" };
  if (status === "pendente") return { background: "rgba(234,179,8,0.18)", color: "#fde047", border: "1px solid #a16207" };
  return { background: "rgba(100,116,139,0.15)", color: "#64748b", border: "1px solid #334155" };
}

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, color: "#e5e7eb", maxWidth: 1000 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  btnGhost: { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, textDecoration: "none", display: "inline-block" },
  planoBanner: { background: "rgba(29,78,216,0.12)", border: "1px solid rgba(29,78,216,0.3)", borderRadius: 16, padding: "20px 28px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 },
  planoBannerLabel: { margin: 0, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  planoBannerNome: { margin: "4px 0 2px", fontSize: 24, fontWeight: 900, color: "#93c5fd" },
  planoBannerPreco: { margin: 0, fontSize: 14, color: "#64748b" },
  planoBannerRight: { textAlign: "right" as const },
  planoBannerData: { margin: "4px 0 10px", fontSize: 16, fontWeight: 700, color: "#e2e8f0" },
  btnUpgrade: { display: "inline-block", padding: "8px 16px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" },
  card: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "24px 28px", marginBottom: 20 },
  cardTitulo: { margin: "0 0 20px", fontSize: 16, fontWeight: 800, color: "#f1f5f9" },
  metricasGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  metricaCard: { background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.1)", borderRadius: 12, padding: "14px 16px" },
  metricaHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  metricaLabel: { fontSize: 12, color: "#64748b", fontWeight: 600 },
  metricaValor: { fontSize: 22, fontWeight: 900 },
  barBg: { height: 5, background: "rgba(148,163,184,0.15)", borderRadius: 999, overflow: "hidden", marginBottom: 6 },
  barFill: { height: "100%", borderRadius: 999, transition: "width 0.4s ease" },
  barLabel: { fontSize: 11, color: "#475569" },
  ilimitadoTag: { fontSize: 11, color: "#86efac", fontWeight: 700, marginTop: 4 },
  alertaTag: { color: "#f59e0b", fontWeight: 700, marginLeft: 6 },
  faturaVazio: { color: "#64748b", fontSize: 13, textAlign: "center" as const, margin: "16px 0" },
  faturaNota: { fontSize: 12, color: "#475569", margin: "14px 0 0" },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid rgba(148,163,184,0.18)", marginBottom: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { background: "#1e293b", color: "#94a3b8", padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" },
  tr: { background: "#0f172a" },
  trAlt: { background: "#0a0f1e" },
  td: { padding: "11px 12px", borderTop: "1px solid rgba(148,163,184,0.10)", verticalAlign: "middle", color: "#cbd5e1" },
  statusBadge: { display: "inline-flex", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  btnDownload: { padding: "4px 10px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "not-allowed", opacity: 0.5 },
  empty: { color: "#64748b", textAlign: "center", marginTop: 24 },
};
