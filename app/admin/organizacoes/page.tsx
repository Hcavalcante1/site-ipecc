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
};

type Membro = {
  id: string;
  org_id: string;
  user_id: string;
  papel: string;
  ativo: boolean;
  created_at: string;
};

const PLANO_OPTS = ["gratuito", "starter", "profissional", "enterprise"] as const;
const VAZIO_ORG = { nome: "", slug: "", plano: "gratuito", email: "" };

export default function OrganizacoesPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VAZIO_ORG);
  const [editPlano, setEditPlano] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: o }, { data: m }] = await Promise.all([
      supabase.from("organizacoes").select("*").order("created_at", { ascending: true }),
      supabase.from("org_membros").select("*").order("created_at", { ascending: true }),
    ]);
    setOrgs((o ?? []) as Org[]);
    setMembros((m ?? []) as Membro[]);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function slugificar(nome: string) {
    return nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function criarOrg() {
    if (!form.nome.trim()) { setMsg("Nome é obrigatório."); return; }
    const slug = form.slug.trim() || slugificar(form.nome);
    setSalvando(true);
    setMsg("Criando...");
    const config: Record<string, string> = {};
    if (form.email.trim()) config.email_contato = form.email.trim();
    const { error } = await supabase.from("organizacoes").insert({
      nome: form.nome.trim(),
      slug,
      plano: form.plano,
      config,
    });
    setSalvando(false);
    if (error) {
      setMsg(`Erro: ${error.message}`);
    } else {
      setMsg("Organização criada.");
      setMostrarForm(false);
      setForm(VAZIO_ORG);
      void carregar();
    }
  }

  async function toggleAtivo(id: string, atual: boolean) {
    await supabase.from("organizacoes").update({ ativo: !atual }).eq("id", id);
    void carregar();
  }

  async function salvarPlano(id: string) {
    const plano = editPlano[id];
    if (!plano) return;
    await supabase.from("organizacoes").update({ plano }).eq("id", id);
    setEditPlano((p) => { const n = { ...p }; delete n[id]; return n; });
    void carregar();
  }

  function membrosDeOrg(orgId: string) {
    return membros.filter((m) => m.org_id === orgId);
  }

  const totalAtivas = orgs.filter((o) => o.ativo).length;
  const porPlano = PLANO_OPTS.reduce<Record<string, number>>((acc, p) => {
    acc[p] = orgs.filter((o) => o.plano === p).length;
    return acc;
  }, {});

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Organizações (Super-Admin)</h1>
          <p style={s.sub}>Gerencie todos os tenants da plataforma IPECC.</p>
        </div>
        <button style={s.btnPrimario} onClick={() => { setMostrarForm(true); setMsg(""); }}>
          + Nova organização
        </button>
      </div>

      {/* Métricas */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>Total</span>
          <strong style={s.statValor}>{orgs.length}</strong>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>Ativas</span>
          <strong style={{ ...s.statValor, color: "#86efac" }}>{totalAtivas}</strong>
        </div>
        {PLANO_OPTS.map((p) => (
          <div key={p} style={s.statCard}>
            <span style={s.statLabel}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
            <strong style={s.statValor}>{porPlano[p] ?? 0}</strong>
          </div>
        ))}
      </div>

      {/* Formulário nova org */}
      {mostrarForm && (
        <div style={s.formCard}>
          <h2 style={s.formTitulo}>Nova organização</h2>
          <div style={s.formGrid}>
            <label style={s.label}>
              Nome *
              <input value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value, slug: slugificar(e.target.value) }))}
                placeholder="Nome da organização" style={s.input} />
            </label>
            <label style={s.label}>
              Slug (URL)
              <input value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="nome-da-org" style={s.input} />
            </label>
            <label style={s.label}>
              Plano inicial
              <select value={form.plano}
                onChange={(e) => setForm((f) => ({ ...f, plano: e.target.value }))}
                style={s.input}>
                {PLANO_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label style={s.label}>
              E-mail de contato
              <input value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contato@org.org.br" style={s.input} />
            </label>
          </div>
          <div style={s.formAcoes}>
            <button style={s.btnPrimario} onClick={criarOrg} disabled={salvando}>
              {salvando ? "Criando..." : "Criar organização"}
            </button>
            <button style={s.btnGhost} onClick={() => { setMostrarForm(false); setMsg(""); }}>Cancelar</button>
            {msg && <span style={s.msgFeedback}>{msg}</span>}
          </div>
        </div>
      )}

      {!mostrarForm && msg && <p style={{ ...s.msgFeedback, marginBottom: 12 }}>{msg}</p>}

      {loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : (
        <div style={s.lista}>
          {orgs.map((org) => {
            const membsDaOrg = membrosDeOrg(org.id);
            const aberta = expandida === org.id;
            return (
              <div key={org.id} style={{ ...s.orgCard, ...(!org.ativo ? s.orgInativa : {}) }}>
                <div style={s.orgHeader} onClick={() => setExpandida(aberta ? null : org.id)}>
                  <div style={s.orgInfo}>
                    <strong style={s.orgNome}>{org.nome}</strong>
                    <code style={s.orgSlug}>{org.slug}</code>
                    {(org.config?.email_contato) && (
                      <span style={s.orgEmail}>{org.config.email_contato}</span>
                    )}
                  </div>
                  <div style={s.orgMeta}>
                    <span style={{ ...s.badge, ...PLANO_CORES[org.plano] }}>
                      {org.plano.toUpperCase()}
                    </span>
                    <span style={{ ...s.badge, ...(org.ativo ? s.badgeAtivo : s.badgeInativo) }}>
                      {org.ativo ? "Ativa" : "Inativa"}
                    </span>
                    <span style={s.membrosCount}>
                      {membsDaOrg.length} membro{membsDaOrg.length !== 1 ? "s" : ""}
                    </span>
                    <span style={s.expandIcon}>{aberta ? "▲" : "▼"}</span>
                  </div>
                </div>

                {aberta && (
                  <div style={s.orgBody}>
                    <div style={s.orgAcoes}>
                      <div style={s.planoEdit}>
                        <label style={s.labelSm}>Plano</label>
                        <select
                          value={editPlano[org.id] ?? org.plano}
                          onChange={(e) => setEditPlano((p) => ({ ...p, [org.id]: e.target.value }))}
                          style={s.selectSm}
                        >
                          {PLANO_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        {editPlano[org.id] && editPlano[org.id] !== org.plano && (
                          <button style={s.btnSm} onClick={() => salvarPlano(org.id)}>Salvar plano</button>
                        )}
                      </div>
                      <button style={s.btnToggle} onClick={() => toggleAtivo(org.id, org.ativo)}>
                        {org.ativo ? "Desativar" : "Reativar"}
                      </button>
                    </div>

                    <div style={s.detalhes}>
                      <div style={s.detalheItem}>
                        <span style={s.detalheLabel}>ID</span>
                        <code style={s.detalheValor}>{org.id}</code>
                      </div>
                      <div style={s.detalheItem}>
                        <span style={s.detalheLabel}>Criada em</span>
                        <span style={s.detalheValorText}>{new Date(org.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      {Object.entries(org.config ?? {}).map(([k, v]) => (
                        <div key={k} style={s.detalheItem}>
                          <span style={s.detalheLabel}>{k}</span>
                          <span style={s.detalheValorText}>{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {membsDaOrg.length > 0 && (
                      <div style={s.membrosSection}>
                        <p style={s.membrosTitle}>Membros cadastrados</p>
                        <div style={s.membrosLista}>
                          {membsDaOrg.map((m) => (
                            <div key={m.id} style={s.membroRow}>
                              <code style={s.membroId}>{m.user_id.slice(0, 8)}…</code>
                              <span style={s.membroPapel}>{m.papel}</span>
                              <span style={{ color: m.ativo ? "#86efac" : "#64748b", fontSize: 11 }}>
                                {m.ativo ? "ativo" : "inativo"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PLANO_CORES: Record<string, React.CSSProperties> = {
  gratuito:    { background: "rgba(100,116,139,0.2)", color: "#94a3b8", border: "1px solid #334155" },
  starter:     { background: "rgba(29,78,216,0.18)", color: "#93c5fd", border: "1px solid #1e40af" },
  profissional:{ background: "rgba(124,58,237,0.18)", color: "#c4b5fd", border: "1px solid #5b21b6" },
  enterprise:  { background: "rgba(22,101,52,0.28)", color: "#86efac", border: "1px solid #166534" },
};

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 24 },
  statCard: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 },
  statLabel: { fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  statValor: { fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  formCard: { background: "rgba(15,23,42,0.92)", border: "1px solid rgba(148,163,184,0.28)", borderRadius: 18, padding: 22, marginBottom: 20 },
  formTitulo: { margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: "#e0f2fe" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 },
  formAcoes: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 },
  label: { fontSize: 13, fontWeight: 600, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 },
  input: { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },
  msgFeedback: { fontSize: 13, color: "#86efac" },
  lista: { display: "flex", flexDirection: "column", gap: 8 },
  orgCard: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 14, overflow: "hidden" },
  orgInativa: { opacity: 0.6 },
  orgHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer", gap: 12, flexWrap: "wrap" },
  orgInfo: { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
  orgNome: { fontSize: 15, fontWeight: 800, color: "#f1f5f9" },
  orgSlug: { fontSize: 11, color: "#38bdf8", fontFamily: "monospace" },
  orgEmail: { fontSize: 11, color: "#64748b" },
  orgMeta: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badge: { display: "inline-flex", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  badgeAtivo: { background: "rgba(22,101,52,0.28)", color: "#86efac", border: "1px solid #166534" },
  badgeInativo: { background: "rgba(100,116,139,0.2)", color: "#64748b", border: "1px solid #334155" },
  membrosCount: { fontSize: 11, color: "#64748b" },
  expandIcon: { fontSize: 10, color: "#475569" },
  orgBody: { padding: "0 18px 18px", borderTop: "1px solid rgba(148,163,184,0.10)" },
  orgAcoes: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 0" },
  planoEdit: { display: "flex", alignItems: "center", gap: 8 },
  labelSm: { fontSize: 11, color: "#64748b", fontWeight: 700 },
  selectSm: { padding: "5px 8px", borderRadius: 7, border: "1px solid rgba(148,163,184,0.4)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 12 },
  btnSm: { padding: "5px 12px", borderRadius: 7, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  btnToggle: { padding: "5px 12px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  detalhes: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  detalheItem: { background: "rgba(148,163,184,0.06)", borderRadius: 8, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 2 },
  detalheLabel: { fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  detalheValor: { fontSize: 11, color: "#7dd3fc", fontFamily: "monospace" },
  detalheValorText: { fontSize: 12, color: "#94a3b8" },
  membrosSection: {},
  membrosTitle: { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 8px" },
  membrosLista: { display: "flex", flexDirection: "column", gap: 4 },
  membroRow: { display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: "#94a3b8" },
  membroId: { fontFamily: "monospace", color: "#64748b", fontSize: 11 },
  membroPapel: { background: "rgba(29,78,216,0.15)", color: "#93c5fd", padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700 },
  btnPrimario: { padding: "9px 18px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnGhost: { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  empty: { color: "#64748b", marginTop: 24, textAlign: "center" },
};
