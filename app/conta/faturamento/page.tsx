"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Org = { id: string; nome: string; plano: string; cnpj_cpf: string | null };
type Assinatura = {
  status: string;
  plano: string;
  periodo_fim: string | null;
  cancelar_no_fim: boolean;
};

function formatarCnpjCpf(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 14);
  if (digitos.length <= 11) {
    return digitos
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digitos
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

const PLANOS = [
  { id: "starter", nome: "Starter", preco: "R$ 190/mês" },
  { id: "profissional", nome: "Profissional", preco: "R$ 490/mês" },
  { id: "enterprise", nome: "Enterprise", preco: "Sob consulta" },
];

export default function FaturamentoContaPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingAtivo, setBillingAtivo] = useState(true);
  const [aviso, setAviso] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [salvandoDoc, setSalvandoDoc] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: membro } = await supabase
      .from("org_membros")
      .select("organizacoes(id, nome, plano, cnpj_cpf)")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    const o = membro?.organizacoes
      ? ((Array.isArray(membro.organizacoes) ? membro.organizacoes[0] : membro.organizacoes) as Org)
      : null;
    setOrg(o);
    setCnpjCpf(o?.cnpj_cpf ? formatarCnpjCpf(o.cnpj_cpf) : "");

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
      } else if (json.error === "cnpj_cpf_obrigatorio") {
        setAviso("Informe o CNPJ ou CPF da organização abaixo antes de assinar um plano.");
      } else {
        setAviso(`Erro: ${json.error ?? "desconhecido"}`);
      }
    } catch {
      setAviso("Falha de rede ao iniciar checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function abrirFatura() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (json.ok && json.url) {
        window.location.href = json.url;
      } else {
        setAviso(`Erro ao abrir fatura: ${json.error ?? "desconhecido"}`);
      }
    } catch {
      setAviso("Falha de rede ao abrir fatura.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function cancelarAssinatura() {
    if (!window.confirm("Cancelar a assinatura? O acesso aos recursos do plano pago é encerrado.")) return;
    setCancelLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "DELETE" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setAviso("Assinatura cancelada.");
        await carregar();
      } else {
        setAviso(`Erro ao cancelar: ${json.error ?? "desconhecido"}`);
      }
    } catch {
      setAviso("Falha de rede ao cancelar.");
    } finally {
      setCancelLoading(false);
    }
  }

  async function salvarCnpjCpf(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    const digitos = cnpjCpf.replace(/\D/g, "");
    if (digitos.length !== 11 && digitos.length !== 14) {
      setAviso("CPF precisa de 11 dígitos ou CNPJ de 14 dígitos.");
      return;
    }
    setSalvandoDoc(true);
    try {
      const { error } = await supabase
        .from("organizacoes")
        .update({ cnpj_cpf: digitos })
        .eq("id", org.id);
      if (error) {
        setAviso(`Erro ao salvar: ${error.message}`);
      } else {
        setOrg({ ...org, cnpj_cpf: digitos });
        setAviso("Documento salvo.");
      }
    } finally {
      setSalvandoDoc(false);
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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
            <button style={s.btnGhost} onClick={abrirFatura} disabled={portalLoading}>
              {portalLoading ? "Abrindo..." : "Ver última fatura →"}
            </button>
            <button style={s.btnCancelar} onClick={cancelarAssinatura} disabled={cancelLoading}>
              {cancelLoading ? "Cancelando..." : "Cancelar assinatura"}
            </button>
          </div>
        ) : null}
      </div>

      {!temAssinatura && !org.cnpj_cpf && (
        <div style={s.card}>
          <h2 style={s.cardTitulo}>CNPJ ou CPF da organização</h2>
          <p style={{ ...s.sub, marginBottom: 14 }}>
            Necessário para gerar cobrança (boleto, Pix ou cartão) e nota fiscal.
          </p>
          <form onSubmit={salvarCnpjCpf} style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              placeholder="00.000.000/0000-00"
              value={cnpjCpf}
              onChange={(e) => setCnpjCpf(formatarCnpjCpf(e.target.value))}
              style={s.input}
            />
            <button type="submit" style={s.btn} disabled={salvandoDoc}>
              {salvandoDoc ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </div>
      )}

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
  btnCancelar: { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.3)", background: "transparent", color: "#f87171", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  input: { flex: 1, padding: 11, borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#e5e7eb", fontSize: 14 },
  planosGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  planoCard: { background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 12, padding: "16px 18px" },
  planoNome: { fontWeight: 800, fontSize: 15, color: "#e2e8f0", marginBottom: 4 },
  planoPreco: { fontSize: 13, color: "#64748b", marginBottom: 14 },
  btn: { width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnLink: { display: "block", textAlign: "center" as const, padding: "9px 0", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", color: "#94a3b8", fontWeight: 700, fontSize: 13, textDecoration: "none" },
};
