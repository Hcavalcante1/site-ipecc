"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Solicitacao = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  mensagem: string | null;
  status: string;
  resposta: string | null;
  respondida_em: string | null;
  created_at: string;
};

type Consentimento = {
  id: string;
  aceito_essencial: boolean;
  aceito_analytics: boolean;
  aceito_marketing: boolean;
  versao_politica: string;
  created_at: string;
};

const TIPO_LABEL: Record<string, string> = {
  acesso: "Acesso",
  exclusao: "Exclusão",
  retificacao: "Retificação",
  portabilidade: "Portabilidade",
  oposicao: "Oposição",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  rejeitada: "Rejeitada",
};

export default function LgpdAdminPage() {
  const [aba, setAba] = useState<"solicitacoes" | "consentimentos">("solicitacoes");
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [consentimentos, setConsentimentos] = useState<Consentimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState<Solicitacao | null>(null);
  const [resposta, setResposta] = useState("");
  const [status, setStatus] = useState("pendente");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: sol }, { data: cons }] = await Promise.all([
      supabase
        .from("lgpd_solicitacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("lgpd_consentimentos")
        .select("id, aceito_essencial, aceito_analytics, aceito_marketing, versao_politica, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setSolicitacoes((sol ?? []) as Solicitacao[]);
    setConsentimentos((cons ?? []) as Consentimento[]);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function abrirSolicitacao(s: Solicitacao) {
    setSelecionada(s);
    setResposta(s.resposta ?? "");
    setStatus(s.status);
    setMsg("");
  }

  async function salvarResposta() {
    if (!selecionada) return;
    setSalvando(true);
    const { error } = await supabase
      .from("lgpd_solicitacoes")
      .update({
        status,
        resposta: resposta.trim() || null,
        respondida_em: status !== "pendente" ? new Date().toISOString() : null,
      })
      .eq("id", selecionada.id);
    setSalvando(false);
    if (error) {
      setMsg(`Erro: ${error.message}`);
    } else {
      setMsg("Salvo.");
      setSelecionada(null);
      void carregar();
    }
  }

  function exportarCSV() {
    const bom = "﻿";
    const header = "Nome,Email,Tipo,Status,Data\n";
    const rows = solicitacoes.map((s) =>
      [s.nome, s.email, TIPO_LABEL[s.tipo] ?? s.tipo, STATUS_LABEL[s.status] ?? s.status,
       new Date(s.created_at).toLocaleDateString("pt-BR")].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lgpd-solicitacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pendentes = solicitacoes.filter((s) => s.status === "pendente").length;

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>LGPD — Privacidade e Dados</h1>
          <p style={s.sub}>Gerencie solicitações de titulares e registros de consentimento.</p>
        </div>
        {aba === "solicitacoes" && (
          <button style={s.btnExport} onClick={exportarCSV}>Exportar CSV</button>
        )}
      </div>

      <div style={s.abas}>
        <button
          style={{ ...s.aba, ...(aba === "solicitacoes" ? s.abaAtiva : {}) }}
          onClick={() => setAba("solicitacoes")}
        >
          Solicitações LGPD
          {pendentes > 0 && <span style={s.badge}>{pendentes}</span>}
        </button>
        <button
          style={{ ...s.aba, ...(aba === "consentimentos" ? s.abaAtiva : {}) }}
          onClick={() => setAba("consentimentos")}
        >
          Registros de consentimento
        </button>
      </div>

      {loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : aba === "solicitacoes" ? (
        <>
          {selecionada && (
            <div style={s.modal}>
              <div style={s.modalCard}>
                <h2 style={s.modalTitulo}>Responder Solicitação</h2>
                <div style={s.modalInfo}>
                  <p><strong>Titular:</strong> {selecionada.nome} — {selecionada.email}</p>
                  <p><strong>Tipo:</strong> {TIPO_LABEL[selecionada.tipo] ?? selecionada.tipo}</p>
                  {selecionada.mensagem && <p><strong>Mensagem:</strong> {selecionada.mensagem}</p>}
                  <p style={s.data}>Recebida em {new Date(selecionada.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <label style={s.labelModal}>
                  Status
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={s.inputModal}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
                <label style={s.labelModal}>
                  Resposta ao titular (opcional — enviada por e-mail externo)
                  <textarea
                    rows={4}
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    style={s.textareaModal}
                    placeholder="Descreva o que foi feito ou a resposta ao titular..."
                  />
                </label>
                <div style={s.modalAcoes}>
                  <button style={s.btnSalvar} onClick={salvarResposta} disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                  <button style={s.btnCancelar} onClick={() => setSelecionada(null)}>Cancelar</button>
                  {msg && <span style={s.msgFeedback}>{msg}</span>}
                </div>
              </div>
            </div>
          )}

          {solicitacoes.length === 0 ? (
            <p style={s.empty}>Nenhuma solicitação recebida ainda.</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Titular", "Tipo", "Status", "Data", ""].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {solicitacoes.map((sol, i) => (
                    <tr key={sol.id} style={i % 2 ? s.trAlt : s.tr}>
                      <td style={s.td}>
                        <strong style={{ color: "#e2e8f0" }}>{sol.nome}</strong>
                        <div style={s.obs}>{sol.email}</div>
                      </td>
                      <td style={s.td}>{TIPO_LABEL[sol.tipo] ?? sol.tipo}</td>
                      <td style={s.td}>
                        <span style={{ ...s.statusBadge, ...statusColor(sol.status) }}>
                          {STATUS_LABEL[sol.status] ?? sol.status}
                        </span>
                      </td>
                      <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                        {new Date(sol.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td style={s.td}>
                        <button style={s.btnVer} onClick={() => abrirSolicitacao(sol)}>
                          Responder
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Essencial", "Analytics", "Marketing", "Versão", "Data"].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {consentimentos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#64748b" }}>
                    Nenhum consentimento registrado ainda.
                  </td>
                </tr>
              ) : consentimentos.map((c, i) => (
                <tr key={c.id} style={i % 2 ? s.trAlt : s.tr}>
                  <td style={s.td}><Bool v={c.aceito_essencial} /></td>
                  <td style={s.td}><Bool v={c.aceito_analytics} /></td>
                  <td style={s.td}><Bool v={c.aceito_marketing} /></td>
                  <td style={s.td}>{c.versao_politica}</td>
                  <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
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

function Bool({ v }: { v: boolean }) {
  return (
    <span style={{ color: v ? "#86efac" : "#64748b", fontWeight: 700, fontSize: 13 }}>
      {v ? "Sim" : "Não"}
    </span>
  );
}

function statusColor(status: string): React.CSSProperties {
  switch (status) {
    case "pendente": return { background: "rgba(234,179,8,0.18)", color: "#fde047", borderColor: "#a16207" };
    case "em_andamento": return { background: "rgba(59,130,246,0.18)", color: "#93c5fd", borderColor: "#1e40af" };
    case "concluida": return { background: "rgba(22,101,52,0.28)", color: "#86efac", borderColor: "#166534" };
    case "rejeitada": return { background: "rgba(127,29,29,0.28)", color: "#fca5a5", borderColor: "#7f1d1d" };
    default: return {};
  }
}

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  btnExport: { padding: "9px 18px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  abas: { display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(148,163,184,0.15)", paddingBottom: 0 },
  aba: { padding: "9px 16px", borderRadius: "8px 8px 0 0", border: "none", background: "transparent", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
  abaAtiva: { background: "rgba(29,78,216,0.18)", color: "#93c5fd", borderBottom: "2px solid #1d4ed8" },
  badge: { background: "#dc2626", color: "#fff", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 800 },
  tableWrap: { overflowX: "auto", borderRadius: 16, border: "1px solid rgba(148,163,184,0.18)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { background: "#1e293b", color: "#94a3b8", padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" },
  tr: { background: "#0f172a" },
  trAlt: { background: "#0a0f1e" },
  td: { padding: "11px 12px", borderTop: "1px solid rgba(148,163,184,0.10)", verticalAlign: "top", color: "#cbd5e1" },
  obs: { fontSize: 11, color: "#64748b", marginTop: 2 },
  data: { margin: 0, fontSize: 11, color: "#64748b" },
  statusBadge: { display: "inline-flex", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, border: "1px solid" },
  btnVer: { padding: "5px 12px", borderRadius: 7, border: "1px solid #1e40af", background: "rgba(30,64,175,0.18)", color: "#93c5fd", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  empty: { color: "#64748b", marginTop: 24, textAlign: "center" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { background: "#0f172a", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 18, padding: 28, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" },
  modalTitulo: { margin: "0 0 16px", fontSize: 17, fontWeight: 800, color: "#f1f5f9" },
  modalInfo: { background: "rgba(148,163,184,0.06)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#cbd5e1", display: "flex", flexDirection: "column", gap: 4 },
  labelModal: { fontSize: 13, fontWeight: 600, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 },
  inputModal: { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },
  textareaModal: { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.4)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13, resize: "vertical" as const, width: "100%" },
  modalAcoes: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 },
  btnSalvar: { padding: "9px 20px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnCancelar: { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  msgFeedback: { fontSize: 13, color: "#86efac" },
};
