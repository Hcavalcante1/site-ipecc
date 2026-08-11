"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { triggerToast } from "@/components/AdminToast";
import Link from "next/link";

type UsageMetric = { label: string; valor: number; limite: number | null; cor: string };

type Assinatura = {
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plano: string;
  status: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  cancelar_no_fim: boolean;
};

const PLANOS_LIMITES: Record<string, Record<string, number | null>> = {
  gratuito:     { editais: 3, propostas: 50, beneficiarios: 0, api_tokens: 0, portal_tokens: 1 },
  starter:      { editais: 20, propostas: 500, beneficiarios: 500, api_tokens: 0, portal_tokens: 10 },
  profissional: { editais: null, propostas: null, beneficiarios: null, api_tokens: 5, portal_tokens: 50 },
  enterprise:   { editais: null, propostas: null, beneficiarios: null, api_tokens: null, portal_tokens: null },
};

const PRECO_PLANOS: Record<string, string> = {
  gratuito:     "R$ 0,00",
  starter:      "R$ 190,00",
  profissional: "R$ 490,00",
  enterprise:   "Sob consulta",
};

const PLANOS_UPGRADE = [
  { id: "starter",      nome: "Starter",      preco: "R$ 190/mês" },
  { id: "profissional", nome: "Profissional",  preco: "R$ 490/mês" },
  { id: "enterprise",   nome: "Enterprise",    preco: "Sob consulta" },
];

export default function FaturamentoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [org, setOrg] = useState<{ id: string; nome: string; plano: string; created_at: string } | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [metricas, setMetricas] = useState<UsageMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingAtivo, setBillingAtivo] = useState(true);

  const checkout = searchParams.get("checkout");

  useEffect(() => {
    if (checkout === "success") {
      triggerToast("Assinatura ativada com sucesso!", "success");
      router.replace("/admin/faturamento");
    } else if (checkout === "cancelled") {
      triggerToast("Checkout cancelado.", "error");
      router.replace("/admin/faturamento");
    }
  }, [checkout, router]);

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

    const { data: assData } = await supabase
      .from("assinaturas")
      .select("stripe_subscription_id, stripe_customer_id, plano, status, periodo_inicio, periodo_fim, cancelar_no_fim")
      .eq("org_id", orgData.id)
      .maybeSingle();

    setAssinatura(assData as Assinatura | null);

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
      { label: "Editais publicados",  valor: editais ?? 0,       limite: limites.editais,       cor: "#38bdf8" },
      { label: "Propostas recebidas", valor: propostas ?? 0,     limite: limites.propostas,     cor: "#a78bfa" },
      { label: "Beneficiários",       valor: beneficiarios ?? 0, limite: limites.beneficiarios, cor: "#86efac" },
      { label: "Portal tokens",       valor: portalTokens ?? 0,  limite: limites.portal_tokens, cor: "#fde047" },
      { label: "API tokens",          valor: apiTokens ?? 0,     limite: limites.api_tokens,    cor: "#fb923c" },
    ]);

    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function iniciarCheckout(plano: string) {
    setCheckoutLoading(plano);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano }),
      });
      const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (json.ok && json.url) {
        window.location.href = json.url;
      } else if (json.error === "billing_not_configured") {
        setBillingAtivo(false);
        triggerToast("Stripe não configurado — adicione STRIPE_SECRET_KEY no Vercel.", "error");
      } else {
        triggerToast(`Erro: ${json.error ?? "desconhecido"}`, "error");
      }
    } catch {
      triggerToast("Falha de rede ao iniciar checkout.", "error");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function abrirPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (json.ok && json.url) {
        window.location.href = json.url;
      } else {
        triggerToast(`Erro ao abrir portal: ${json.error ?? "desconhecido"}`, "error");
      }
    } catch {
      triggerToast("Falha de rede ao abrir portal.", "error");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) return <div style={s.wrap}><p style={s.empty}>Carregando...</p></div>;
  if (!org) return <div style={s.wrap}><p style={s.empty}>Organização não encontrada.</p></div>;

  const planoEfetivo = org.plano;
  const temAssinatura = !!assinatura?.stripe_subscription_id;
  const proximaRenovacao = assinatura?.periodo_fim
    ? new Date(assinatura.periodo_fim)
    : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1); return d; })();

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

      {!billingAtivo && (
        <div style={s.alertBox}>
          <strong>Billing não configurado.</strong> Para ativar assinaturas reais, adicione as variáveis de ambiente no Vercel:
          {" "}<code style={s.code}>STRIPE_SECRET_KEY</code>, <code style={s.code}>STRIPE_WEBHOOK_SECRET</code>,{" "}
          <code style={s.code}>STRIPE_PRICE_STARTER</code>, <code style={s.code}>STRIPE_PRICE_PROFISSIONAL</code>,{" "}
          <code style={s.code}>STRIPE_PRICE_ENTERPRISE</code>.
        </div>
      )}

      {/* Plano atual */}
      <div style={s.planoBanner}>
        <div>
          <p style={s.planoBannerLabel}>Plano atual</p>
          <p style={s.planoBannerNome}>{planoEfetivo.charAt(0).toUpperCase() + planoEfetivo.slice(1)}</p>
          <p style={s.planoBannerPreco}>{PRECO_PLANOS[planoEfetivo] ?? "—"}/mês</p>
          {assinatura && (
            <p style={s.statusBadgeRow}>
              <span style={{ ...s.statusChip, ...statusCor(assinatura.status) }}>
                {assinatura.status.toUpperCase()}
              </span>
              {assinatura.cancelar_no_fim && (
                <span style={{ ...s.statusChip, background: "rgba(127,29,29,0.3)", color: "#fca5a5", border: "1px solid #7f1d1d", marginLeft: 6 }}>
                  Cancela no fim do período
                </span>
              )}
            </p>
          )}
        </div>
        <div style={s.planoBannerRight}>
          <p style={s.planoBannerLabel}>
            {assinatura?.cancelar_no_fim ? "Acesso até" : "Próxima renovação"}
          </p>
          <p style={s.planoBannerData}>{proximaRenovacao.toLocaleDateString("pt-BR")}</p>
          {temAssinatura ? (
            <button
              style={s.btnPortal}
              onClick={abrirPortal}
              disabled={portalLoading}
            >
              {portalLoading ? "Abrindo..." : "Gerenciar assinatura →"}
            </button>
          ) : planoEfetivo !== "enterprise" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {PLANOS_UPGRADE.filter((p) => p.id !== planoEfetivo).map((p) => (
                <button
                  key={p.id}
                  style={{ ...s.btnUpgrade, opacity: checkoutLoading === p.id ? 0.7 : 1 }}
                  onClick={() => void iniciarCheckout(p.id)}
                  disabled={!!checkoutLoading}
                >
                  {checkoutLoading === p.id ? "Aguarde..." : `Assinar ${p.nome} — ${p.preco}`}
                </button>
              ))}
            </div>
          ) : null}
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
                      <div style={{ ...s.barFill, width: `${pct}%`, background: alerta ? "#f59e0b" : m.cor }} />
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

      {/* Assinatura Stripe */}
      {assinatura && (
        <div style={s.card}>
          <h2 style={s.cardTitulo}>Dados da assinatura</h2>
          <div style={s.assGrid}>
            {[
              { label: "ID assinatura", valor: assinatura.stripe_subscription_id ?? "—" },
              { label: "Status",        valor: assinatura.status },
              { label: "Período início",valor: assinatura.periodo_inicio ? new Date(assinatura.periodo_inicio).toLocaleDateString("pt-BR") : "—" },
              { label: "Período fim",   valor: assinatura.periodo_fim    ? new Date(assinatura.periodo_fim).toLocaleDateString("pt-BR")    : "—" },
            ].map((row) => (
              <div key={row.label} style={s.assRow}>
                <span style={s.assLabel}>{row.label}</span>
                <span style={s.assValor}>{row.valor}</span>
              </div>
            ))}
          </div>
          <button style={s.btnPortal} onClick={abrirPortal} disabled={portalLoading}>
            {portalLoading ? "Abrindo..." : "Abrir portal do cliente Stripe →"}
          </button>
        </div>
      )}

      {/* Planos disponíveis (quando sem assinatura ativa) */}
      {!temAssinatura && (
        <div style={s.card}>
          <h2 style={s.cardTitulo}>Upgrade de plano</h2>
          <p style={{ ...s.sub, marginBottom: 20 }}>
            Escolha um plano e clique para assinar via Stripe Checkout.
          </p>
          <div style={s.planosGrid}>
            {PLANOS_UPGRADE.map((p) => {
              const ativo = planoEfetivo === p.id;
              return (
                <div key={p.id} style={{ ...s.planoCard, ...(ativo ? s.planoAtivo : {}) }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#e2e8f0", marginBottom: 4 }}>{p.nome}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>{p.preco}</div>
                  {ativo ? (
                    <div style={s.planoAtualBadge}>Plano atual</div>
                  ) : p.id !== "enterprise" ? (
                    <button
                      style={{ ...s.btnUpgrade, width: "100%", opacity: checkoutLoading === p.id ? 0.7 : 1 }}
                      onClick={() => void iniciarCheckout(p.id)}
                      disabled={!!checkoutLoading}
                    >
                      {checkoutLoading === p.id ? "Aguarde..." : "Assinar agora"}
                    </button>
                  ) : (
                    <a href="mailto:contato@ipecc.org.br" style={{ ...s.btnUpgrade, textDecoration: "none", textAlign: "center" as const, display: "block" }}>
                      Entrar em contato
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={s.faturaNota}>
        Pagamentos processados com segurança via Stripe. Dados sincronizados automaticamente via webhook.
        {!billingAtivo && " — Billing em modo scaffold: configure as variáveis de ambiente Stripe para ativar."}
      </p>
    </div>
  );
}

function statusCor(status: string): React.CSSProperties {
  switch (status) {
    case "ativo":       return { background: "rgba(22,101,52,0.28)",  color: "#86efac", border: "1px solid #166534" };
    case "trial":       return { background: "rgba(29,78,216,0.22)",  color: "#93c5fd", border: "1px solid #1e40af" };
    case "inadimplente":return { background: "rgba(234,179,8,0.18)",  color: "#fde047", border: "1px solid #a16207" };
    case "cancelado":   return { background: "rgba(127,29,29,0.2)",   color: "#fca5a5", border: "1px solid #7f1d1d" };
    default:            return { background: "rgba(100,116,139,0.15)", color: "#64748b", border: "1px solid #334155" };
  }
}

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, color: "#e5e7eb", maxWidth: 1000, position: "relative" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  btnGhost: { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, textDecoration: "none", display: "inline-block" },
  alertBox: { background: "rgba(234,179,8,0.1)", border: "1px solid #a16207", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#fde047", lineHeight: 1.6 },
  code: { fontFamily: "monospace", background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 4 },
  planoBanner: { background: "rgba(29,78,216,0.12)", border: "1px solid rgba(29,78,216,0.3)", borderRadius: 16, padding: "20px 28px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 },
  planoBannerLabel: { margin: 0, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  planoBannerNome: { margin: "4px 0 2px", fontSize: 24, fontWeight: 900, color: "#93c5fd" },
  planoBannerPreco: { margin: 0, fontSize: 14, color: "#64748b" },
  statusBadgeRow: { margin: "10px 0 0", display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: 6 },
  statusChip: { display: "inline-flex", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  planoBannerRight: { textAlign: "right" as const },
  planoBannerData: { margin: "4px 0 10px", fontSize: 16, fontWeight: 700, color: "#e2e8f0" },
  btnUpgrade: { display: "inline-block", padding: "8px 16px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", cursor: "pointer" },
  btnPortal: { marginTop: 8, padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.35)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer" },
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
  assGrid: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  assRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(148,163,184,0.08)", fontSize: 13 },
  assLabel: { color: "#64748b", fontWeight: 600 },
  assValor: { color: "#e2e8f0", fontFamily: "monospace", fontSize: 12 },
  planosGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 },
  planoCard: { background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 12, padding: "16px 18px" },
  planoAtivo: { border: "1px solid #1d4ed8", background: "rgba(29,78,216,0.1)" },
  planoAtualBadge: { fontSize: 11, fontWeight: 800, color: "#93c5fd", textAlign: "center" as const },
  faturaNota: { fontSize: 12, color: "#475569", margin: "4px 0 0" },
  empty: { color: "#64748b", textAlign: "center", marginTop: 24 },
};
