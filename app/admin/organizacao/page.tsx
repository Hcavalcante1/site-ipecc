"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Org = {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  plano: string;
  ativo: boolean;
  config: Record<string, string>;
  created_at: string;
  updated_at: string;
};

const PLANO_CORES: Record<string, React.CSSProperties> = {
  gratuito:    { background: "rgba(100,116,139,0.2)", color: "#94a3b8", border: "1px solid #334155" },
  starter:     { background: "rgba(29,78,216,0.18)", color: "#93c5fd", border: "1px solid #1e40af" },
  profissional:{ background: "rgba(124,58,237,0.18)", color: "#c4b5fd", border: "1px solid #5b21b6" },
  enterprise:  { background: "rgba(22,101,52,0.28)", color: "#86efac", border: "1px solid #166534" },
};

const CONFIG_CAMPOS = [
  { key: "cnpj",           label: "CNPJ",            placeholder: "00.000.000/0001-00" },
  { key: "email_contato",  label: "E-mail de contato", placeholder: "contato@org.org.br" },
  { key: "site",           label: "Site",             placeholder: "https://org.org.br" },
  { key: "municipio",      label: "Município",        placeholder: "São Paulo" },
  { key: "estado",         label: "Estado (UF)",      placeholder: "SP" },
  { key: "descricao",      label: "Descrição curta",  placeholder: "Missão ou propósito da organização" },
] as const;

export default function OrganizacaoPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [form, setForm] = useState({ nome: "", logo_url: "", config: {} as Record<string, string> });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizacoes")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) {
      const o = data as Org;
      setOrg(o);
      setForm({
        nome: o.nome,
        logo_url: o.logo_url ?? "",
        config: (o.config ?? {}) as Record<string, string>,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function setConfig(key: string, value: string) {
    setForm((f) => ({ ...f, config: { ...f.config, [key]: value } }));
  }

  async function salvar() {
    if (!org) return;
    if (!form.nome.trim()) { setMsg({ texto: "Nome é obrigatório.", ok: false }); return; }
    setSalvando(true);
    const { error } = await supabase.from("organizacoes").update({
      nome: form.nome.trim(),
      logo_url: form.logo_url.trim() || null,
      config: form.config,
    }).eq("id", org.id);
    setSalvando(false);
    if (error) {
      setMsg({ texto: `Erro: ${error.message}`, ok: false });
    } else {
      setMsg({ texto: "Salvo com sucesso.", ok: true });
      void carregar();
    }
  }

  if (loading) return <div style={s.wrap}><p style={s.empty}>Carregando...</p></div>;
  if (!org) return <div style={s.wrap}><p style={s.empty}>Organização não encontrada.</p></div>;

  const planoStyle = PLANO_CORES[org.plano] ?? PLANO_CORES.gratuito;

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Minha Organização</h1>
          <p style={s.sub}>Configurações e identidade da sua organização no sistema IPECC.</p>
        </div>
        <div style={s.planoBadge}>
          <span style={{ ...s.badge, ...planoStyle }}>{org.plano.toUpperCase()}</span>
          <span style={s.slugLabel}>slug: <code style={s.slug}>{org.slug}</code></span>
        </div>
      </div>

      {/* Cards de status */}
      <div style={s.statsGrid}>
        {[
          { label: "Plano atual", valor: org.plano.charAt(0).toUpperCase() + org.plano.slice(1) },
          { label: "Status", valor: org.ativo ? "Ativa" : "Inativa" },
          { label: "Criada em", valor: new Date(org.created_at).toLocaleDateString("pt-BR") },
          { label: "Última atualização", valor: new Date(org.updated_at).toLocaleDateString("pt-BR") },
        ].map((c) => (
          <div key={c.label} style={s.statCard}>
            <span style={s.statLabel}>{c.label}</span>
            <strong style={s.statValor}>{c.valor}</strong>
          </div>
        ))}
      </div>

      {/* Formulário */}
      <div style={s.card}>
        <h2 style={s.cardTitulo}>Informações da organização</h2>

        <div style={s.formGrid}>
          <label style={s.label}>
            Nome da organização *
            <input value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Nome completo" style={s.input} />
          </label>
          <label style={s.label}>
            URL do logo (imagem)
            <input value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..." style={s.input} />
          </label>
        </div>

        <h3 style={s.secTitle}>Dados de contato e perfil</h3>
        <div style={s.formGrid}>
          {CONFIG_CAMPOS.map((campo) => (
            <label key={campo.key} style={s.label}>
              {campo.label}
              <input
                value={(form.config[campo.key] as string | undefined) ?? ""}
                onChange={(e) => setConfig(campo.key, e.target.value)}
                placeholder={campo.placeholder}
                style={s.input}
              />
            </label>
          ))}
        </div>

        <div style={s.acoes}>
          <button style={s.btnPrimario} onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
          {msg && (
            <span style={{ ...s.msgFeedback, color: msg.ok ? "#86efac" : "#fca5a5" }}>
              {msg.texto}
            </span>
          )}
        </div>
      </div>

      {/* Planos disponíveis */}
      <div style={s.card}>
        <h2 style={s.cardTitulo}>Planos disponíveis</h2>
        <div style={s.planosGrid}>
          {PLANOS.map((p) => (
            <div key={p.id} style={{ ...s.planoCard, ...(org.plano === p.id ? s.planoAtivo : {}) }}>
              <div style={s.planoHeader}>
                <strong style={s.planoNome}>{p.nome}</strong>
                <span style={s.planoPreco}>{p.preco}</span>
              </div>
              <ul style={s.planoFeatures}>
                {p.features.map((f) => (
                  <li key={f} style={s.planoFeature}>✓ {f}</li>
                ))}
              </ul>
              {org.plano === p.id && (
                <div style={s.planoAtualBadge}>Plano atual</div>
              )}
            </div>
          ))}
        </div>
        <p style={s.planoNota}>
          Para fazer upgrade de plano, entre em contato com a equipe IPECC.
        </p>
      </div>
    </div>
  );
}

const PLANOS = [
  {
    id: "gratuito",
    nome: "Gratuito",
    preco: "R$ 0/mês",
    features: ["1 usuário admin", "Editais e propostas básicos", "Transparência pública"],
  },
  {
    id: "starter",
    nome: "Starter",
    preco: "R$ 190/mês",
    features: ["5 usuários admin", "Beneficiários (até 500)", "Portal do Financiador", "Exportação CSV"],
  },
  {
    id: "profissional",
    nome: "Profissional",
    preco: "R$ 490/mês",
    features: ["20 usuários admin", "Beneficiários ilimitados", "API pública v1", "LGPD nativa", "Gestão documental"],
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    preco: "Sob consulta",
    features: ["Usuários ilimitados", "Multi-tenancy", "SLA dedicado", "White-label", "Suporte prioritário"],
  },
] as const;

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, color: "#e5e7eb", maxWidth: 1000 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  planoBadge: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 },
  badge: { display: "inline-flex", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800 },
  slugLabel: { fontSize: 11, color: "#475569" },
  slug: { fontFamily: "monospace", color: "#7dd3fc" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 },
  statCard: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 },
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  statValor: { fontSize: 18, fontWeight: 800, color: "#f1f5f9" },
  card: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "24px 28px", marginBottom: 20 },
  cardTitulo: { margin: "0 0 18px", fontSize: 16, fontWeight: 800, color: "#f1f5f9" },
  secTitle: { margin: "20px 0 12px", fontSize: 13, fontWeight: 800, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  label: { fontSize: 13, fontWeight: 600, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 },
  input: { marginTop: 2, padding: "9px 11px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },
  acoes: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 20 },
  btnPrimario: { padding: "10px 22px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  msgFeedback: { fontSize: 13, fontWeight: 600 },
  planosGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 },
  planoCard: { background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 12, padding: "16px 18px" },
  planoAtivo: { border: "1px solid #1d4ed8", background: "rgba(29,78,216,0.1)" },
  planoHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  planoNome: { fontSize: 14, fontWeight: 800, color: "#e2e8f0" },
  planoPreco: { fontSize: 12, color: "#64748b" },
  planoFeatures: { margin: 0, padding: 0, listStyle: "none" },
  planoFeature: { fontSize: 12, color: "#94a3b8", marginBottom: 4 },
  planoAtualBadge: { marginTop: 10, fontSize: 11, fontWeight: 800, color: "#93c5fd", textAlign: "center" as const },
  planoNota: { fontSize: 12, color: "#475569", margin: 0 },
  empty: { color: "#64748b", textAlign: "center", marginTop: 24 },
};
