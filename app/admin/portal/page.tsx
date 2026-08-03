"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { triggerToast } from "@/components/AdminToast";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";

type Token = {
  id: string;
  token: string;
  label: string;
  descricao: string | null;
  ativo: boolean;
  expira_em: string | null;
  acessos: number;
  ultimo_acesso_em: string | null;
  criado_por: string | null;
  created_at: string;
};

const VAZIO = { label: "", descricao: "", expira_em: "", criado_por: "" };

export default function PortalAdminPage() {
  const [lista, setLista] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [origem, setOrigem] = useState("");

  useEffect(() => {
    setOrigem(window.location.origin);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("portal_tokens")
      .select("*")
      .order("created_at", { ascending: false });
    setLista((data ?? []) as Token[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function copiarLink(token: string) {
    const url = `${origem}/portal/${token}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiado(token);
      setTimeout(() => setCopiado(null), 2500);
    });
  }

  async function salvar() {
    if (!form.label.trim()) {
      setMsg("Nome do parceiro é obrigatório.");
      return;
    }
    setSalvando(true);
    setMsg("Criando...");

    const { error } = await supabase.from("portal_tokens").insert({
      label: form.label.trim(),
      descricao: form.descricao.trim() || null,
      expira_em: form.expira_em || null,
      criado_por: form.criado_por.trim() || null,
    });

    setSalvando(false);
    if (error) {
      setMsg(`Erro: ${error.message}`);
    } else {
      setMsg("Token criado.");
      setMostrarForm(false);
      setForm(VAZIO);
      void carregar();
    }
  }

  async function toggleAtivo(id: string, atual: boolean) {
    await supabase.from("portal_tokens").update({ ativo: !atual }).eq("id", id);
    void carregar();
  }

  async function excluir(id: string, label: string) {
    const ok = await confirmAction(`Revogar e excluir o token de "${label}"? O parceiro perderá o acesso imediatamente.`);
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm(`Revogar e excluir o token de "${label}"?`)) return;
      else if (isConfirmModalReady()) return;
    }
    const { error } = await supabase.from("portal_tokens").delete().eq("id", id);
    if (error) { triggerToast(`Erro ao excluir: ${error.message}`, "error"); return; }
    triggerToast(`Token de "${label}" revogado.`, "success");
    void carregar();
  }

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Portal do Financiador</h1>
          <p style={s.sub}>
            Gere links privados para parceiros acompanharem projetos e resultados sem precisar de login.
          </p>
        </div>
        <button style={s.btnPrimario} onClick={() => { setMostrarForm(true); setMsg(""); }}>
          + Novo link de acesso
        </button>
      </div>

      {mostrarForm && (
        <div style={s.formCard}>
          <h2 style={s.formTitulo}>Novo link de acesso</h2>
          <div style={s.formGrid}>
            <Campo label="Nome do parceiro / financiador *" value={form.label}
              onChange={(v) => setForm((f) => ({ ...f, label: v }))}
              placeholder="Ex: Secretaria de Cultura SP" />
            <Campo label="Criado por (admin)" value={form.criado_por}
              onChange={(v) => setForm((f) => ({ ...f, criado_por: v }))}
              placeholder="Seu e-mail ou nome" />
            <Campo label="Expira em (opcional)" type="date" value={form.expira_em}
              onChange={(v) => setForm((f) => ({ ...f, expira_em: v }))} />
          </div>
          <label style={s.label}>
            Descrição / observação interna
            <textarea rows={2} value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              style={s.textarea} placeholder="Ex: Convênio 001/2026 — acompanhamento mensal" />
          </label>
          <div style={s.formAcoes}>
            <button style={s.btnPrimario} onClick={salvar} disabled={salvando}>
              {salvando ? "Gerando..." : "Gerar link"}
            </button>
            <button style={s.btnGhost} onClick={() => { setMostrarForm(false); setMsg(""); }}>
              Cancelar
            </button>
            {msg && <span style={s.msgFeedback}>{msg}</span>}
          </div>
        </div>
      )}

      {!mostrarForm && msg && (
        <p style={{ ...s.msgFeedback, marginBottom: 12 }}>{msg}</p>
      )}

      {/* Stats */}
      {!loading && lista.length > 0 && (
        <div style={s.statsRow}>
          {[
            { label: "Total de links",     valor: lista.length,                                          cor: "#94a3b8" },
            { label: "Ativos",             valor: lista.filter((t) => t.ativo).length,                  cor: "#86efac" },
            { label: "Inativos",           valor: lista.filter((t) => !t.ativo).length,                 cor: "#fca5a5" },
            { label: "Total de acessos",   valor: lista.reduce((s, t) => s + (t.acessos ?? 0), 0),     cor: "#93c5fd" },
          ].map((st) => (
            <div key={st.label} style={s.statCard}>
              <div style={{ ...s.statNum, color: st.cor }}>{st.valor}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : lista.length === 0 ? (
        <p style={s.empty}>Nenhum link criado ainda.</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Parceiro", "Token / Link", "Acessos", "Expira", "Status", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((t, i) => (
                <tr key={t.id} style={i % 2 ? s.trAlt : s.tr}>
                  <td style={s.td}>
                    <strong style={{ color: "#e2e8f0" }}>{t.label}</strong>
                    {t.descricao && <div style={s.obs}>{t.descricao}</div>}
                    {t.criado_por && <div style={s.obs}>por {t.criado_por}</div>}
                  </td>
                  <td style={s.td}>
                    <div style={s.tokenCode}>{t.token}</div>
                    <button
                      style={{ ...s.btnCopiar, ...(copiado === t.token ? s.btnCopiado : {}) }}
                      onClick={() => copiarLink(t.token)}
                    >
                      {copiado === t.token ? "Copiado!" : "Copiar link"}
                    </button>
                  </td>
                  <td style={s.td}>
                    <strong style={{ color: "#7dd3fc" }}>{t.acessos}</strong>
                    {t.ultimo_acesso_em && (
                      <div style={s.obs}>
                        {new Date(t.ultimo_acesso_em).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </td>
                  <td style={s.td}>
                    {t.expira_em
                      ? new Date(t.expira_em + "T12:00:00").toLocaleDateString("pt-BR")
                      : "Sem expiração"}
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...(t.ativo ? s.badgeAtivo : s.badgeInativo) }}>
                      {t.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={s.tdAcoes}>
                    <button style={s.btnToggle} onClick={() => toggleAtivo(t.id, t.ativo)}>
                      {t.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button style={s.btnDel} onClick={() => excluir(t.id, t.label)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Campo({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label style={s.label}>
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={s.input} />
    </label>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 0", color: "#94a3b8", fontSize: 13, maxWidth: 560 },
  formCard: { background: "rgba(15,23,42,0.92)", border: "1px solid rgba(148,163,184,0.28)", borderRadius: 18, padding: 22, marginBottom: 20 },
  formTitulo: { margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#e0f2fe" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 },
  formAcoes: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 },
  label: { fontSize: 13, fontWeight: 600, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 },
  input: { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },
  textarea: { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13, resize: "vertical", width: "100%" },
  msgFeedback: { fontSize: 13, color: "#86efac" },
  tableWrap: { overflowX: "auto", borderRadius: 16, border: "1px solid rgba(148,163,184,0.18)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { background: "#1e293b", color: "#94a3b8", padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" },
  tr: { background: "#0f172a" },
  trAlt: { background: "#0a0f1e" },
  td: { padding: "11px 12px", borderTop: "1px solid rgba(148,163,184,0.10)", verticalAlign: "top", color: "#cbd5e1" },
  tdAcoes: { padding: "11px 12px", borderTop: "1px solid rgba(148,163,184,0.10)", whiteSpace: "nowrap" },
  obs: { fontSize: 11, color: "#64748b", marginTop: 2 },
  tokenCode: { fontFamily: "monospace", fontSize: 11, color: "#7dd3fc", marginBottom: 4 },
  btnPrimario: { padding: "9px 18px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnGhost: { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnCopiar: { padding: "4px 10px", borderRadius: 7, border: "1px solid #1e40af", background: "rgba(30,64,175,0.18)", color: "#93c5fd", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  btnCopiado: { background: "rgba(22,101,52,0.28)", borderColor: "#166534", color: "#86efac" },
  btnToggle: { marginRight: 6, padding: "5px 10px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnDel: { padding: "5px 10px", borderRadius: 7, border: "1px solid #7f1d1d", background: "rgba(127,29,29,0.18)", color: "#fca5a5", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  badge: { display: "inline-flex", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  badgeAtivo: { background: "rgba(22,101,52,0.28)", color: "#86efac", border: "1px solid #166534" },
  badgeInativo: { background: "rgba(100,116,139,0.2)", color: "#64748b", border: "1px solid #334155" },
  empty: { color: "#64748b", marginTop: 24, textAlign: "center" },
  statsRow: { display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 20 },
  statCard: { flex: "1 1 130px", background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 14, padding: "14px 18px" },
  statNum:  { fontSize: 26, fontWeight: 900, lineHeight: 1, marginBottom: 4 },
  statLabel:{ fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
};
