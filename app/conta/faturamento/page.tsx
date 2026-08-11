"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Org = { id: string; nome: string; plano: string };
type Assinatura = {
  status: string;
  plano: string;
  periodo_fim: string | null;
  cancelar_no_fim: boolean;
};

const PLANOS = [
  { id: "starter", nome: "Starter", preco: "R$ 190/mês" },
  { id: "profissional", nome: "Profissional", preco: "R$ 490/mês" },
  { id: "enterprise", nome: "Enterprise", preco: "Sob consulta" },
];

export default function FaturamentoContaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingAtivo, setBillingAtivo] = useState(true);
  const [aviso, setAviso] = useState("");

  const checkout = searchParams.get("checkout");

  useEffect(() => {
    if (checkout === "success") {
      setAviso("Assinatura ativada com sucesso!");
      router.replace("/conta/faturamento");
    } else if (checkout === "cancelled") {
      setAviso("Checkout cancelado.");
      router.replace("/conta/faturamento");
    }
  }, [checkout, router]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: membro } = await supabase
      .from("org_membros")
      .select("organizacoes(id, nome, plano)")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    const o = membro?.organizacoes
      ? ((Array.isArray(membro.organizacoes) ? membro.organizacoes[0] : membro.organizacoes) as Org)
      : null;
    setOrg(o);

    if (o) {
      const { data: assData } = await supabase
        .from("assinaturas")
        .select("status, plano, periodo_fim, cancelar_no_fim")
        .eq("org_id", o.id)
        .maybeSingle();
      setAssinatura(assData as Assinatura | null);
    }

    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function iniciarCheckout(plano: string) {
    setCheckoutLoading(plano);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano, retorno: "/conta/faturamento" }),
      });
      const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (json.ok && json.url) {
        window.location.href = json.url;
      } else if (json.error === "billing_not_configured") {
        setBillingAtivo(false);
        setAviso("Pagamentos ainda não configurados. Fale com nossa equipe para contratar.");
      } else {
        setAviso(`Erro: ${json.error ?? "desconhecido"}`);
      }
    } catch {
      setAviso("Falha de rede ao iniciar checkout.");
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
        setAviso(`Erro ao abrir portal: ${json.error ?? "desconhecido"}`);
      }
    } catch {
      setAviso("Falha de rede ao abrir portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) return <div style={s.wrap}><p style={s.loading}>Carregando...</p></div>;
  if (!org) return <div style={s.wrap}><p style={s.loading}>Organização não encontrada.</p></div>;

  const temAssinatura = assinatura?.status === "ativo" || assinatura?.status === "trial";

  return (
    <div style={s.wrap}>
      <h1 style={s.titulo}>Faturamento</h1>
      <p style={s.sub}>Plano contratado e gerenciamento de assinatura.</p>

      {!billingAtivo && (
        <div style={s.alertBox}>
          Pagamentos ainda não estão disponíveis nesta plataforma. Entre em contato
          com a equipe IPECC para contratar um plano.
        </div>
      )}
      {aviso && <div style={s.avisoBox}>{aviso}</div>}

      <div style={s.card}>
        <p style={s.cardLabel}>Plano atual</p>
        <p style={s.cardValor}>{org.plano.charAt(0).toUpperCase() + org.plano.slice(1)}</p>
        {temAssinatura ? (
          <button style={s.btnGhost} onClick={abrirPortal} disabled={portalLoading}>
            {portalLoading ? "Abrindo..." : "Gerenciar assinatura →"}
          </button>
        ) : null}
      </div>

      {!temAssinatura && (
        <div style={s.card}>
          <h2 style={s.cardTitulo}>Planos disponíveis</h2>
          <div style={s.planosGrid}>
            {PLANOS.map((p) => (
              <div key={p.id} style={s.planoCard}>
                <div style={s.planoNome}>{p.nome}</div>
                <div style={s.planoPreco}>{p.preco}</div>
                {p.id !== "enterprise" ? (
                  <button
                    style={{ ...s.btn, opacity: checkoutLoading === p.id ? 0.7 : 1 }}
                    onClick={() => void iniciarCheckout(p.id)}
                    disabled={!!checkoutLoading}
                  >
                    {checkoutLoading === p.id ? "Aguarde..." : "Assinar"}
                  </button>
                ) : (
                  <a href="mailto:contato@ipecc.org.br" style={s.btnLink}>Entrar em contato</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 32, color: "#e5e7eb", maxWidth: 800 },
  loading: { color: "#64748b" },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 24px", color: "#94a3b8", fontSize: 13 },
  alertBox: { background: "rgba(234,179,8,0.1)", border: "1px solid #a16207", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#fde047" },
  avisoBox: { background: "rgba(29,78,216,0.1)", border: "1px solid #1e40af", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#93c5fd" },
  card: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "22px 24px", marginBottom: 16 },
  cardLabel: { margin: 0, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  cardValor: { margin: "6px 0 14px", fontSize: 20, fontWeight: 900, color: "#93c5fd" },
  cardTitulo: { margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#f1f5f9" },
  btnGhost: { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  planosGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  planoCard: { background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 12, padding: "16px 18px" },
  planoNome: { fontWeight: 800, fontSize: 15, color: "#e2e8f0", marginBottom: 4 },
  planoPreco: { fontSize: 13, color: "#64748b", marginBottom: 14 },
  btn: { width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnLink: { display: "block", textAlign: "center" as const, padding: "9px 0", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", color: "#94a3b8", fontWeight: 700, fontSize: 13, textDecoration: "none" },
};
