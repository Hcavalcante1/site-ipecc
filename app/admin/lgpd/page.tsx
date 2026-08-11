"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Status = "pendente" | "em_andamento" | "concluida" | "rejeitada";

type Solicitacao = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  mensagem: string | null;
  status: Status;
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
  acesso:        "Acesso aos dados",
  exclusao:      "Exclusão de dados",
  retificacao:   "Retificação de dados",
  portabilidade: "Portabilidade de dados",
  oposicao:      "Oposição ao tratamento",
};

const STATUS_LABEL: Record<Status, string> = {
  pendente:     "Pendente",
  em_andamento: "Em andamento",
  concluida:    "Concluída",
  rejeitada:    "Rejeitada",
};

const STATUS_ESTILO: Record<Status, React.CSSProperties> = {
  pendente:     { background: "rgba(234,179,8,0.18)",   color: "#fde047", border: "1px solid #a16207" },
  em_andamento: { background: "rgba(59,130,246,0.18)", color: "#93c5fd", border: "1px solid #1e40af" },
  concluida:    { background: "rgba(22,101,52,0.28)",  color: "#86efac", border: "1px solid #166534" },
  rejeitada:    { background: "rgba(127,29,29,0.28)",  color: "#fca5a5", border: "1px solid #7f1d1d" },
};

const SLA_DIAS = 15;

const TEMPLATES: Record<string, string> = {
  acesso:
    "Informamos que seus dados pessoais em nosso cadastro são: [descreva os dados]. Eles são utilizados para [finalidade]. Caso deseje mais detalhes, entre em contato.",
  exclusao:
    "Sua solicitação de exclusão foi processada. Os dados pessoais identificados em nosso sistema foram eliminados, exceto aqueles cuja retenção seja obrigatória por lei ou contrato.",
  retificacao:
    "Os dados pessoais indicados em sua solicitação foram corrigidos/atualizados conforme as informações fornecidas. O registro foi atualizado em [data].",
  portabilidade:
    "Seguem em anexo seus dados pessoais em formato estruturado (CSV), conforme solicitado. Os dados abrangem o período de [início] a [fim].",
  oposicao:
    "Sua oposição ao tratamento de dados pessoais para fins de [finalidade] foi registrada e o tratamento foi cessado a partir desta data.",
};

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function slaEstilo(dias: number): React.CSSProperties {
  if (dias >= SLA_DIAS)  return { color: "#fca5a5", fontWeight: 800 };
  if (dias >= SLA_DIAS - 5) return { color: "#fde047", fontWeight: 700 };
  return { color: "#86efac", fontWeight: 600 };
}

function slaLabel(dias: number): string {
  const restam = SLA_DIAS - dias;
  if (restam <= 0) return `${Math.abs(restam)}d fora do prazo`;
  return `${restam}d restante${restam !== 1 ? "s" : ""}`;
}

export default function LgpdAdminPage() {
  const [aba, setAba]               = useState<"solicitacoes" | "consentimentos">("solicitacoes");
  const [solicitacoes, setSolic]    = useState<Solicitacao[]>([]);
  const [consentimentos, setCons]   = useState<Consentimento[]>([]);
  const [loading, setLoading]       = useState(true);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo]     = useState("");

  // Modal de resposta
  const [selecionada, setSelecionada] = useState<Solicitacao | null>(null);
  const [status, setStatus]           = useState<Status>("pendente");
  const [resposta, setResposta]       = useState("");
  const [salvando, setSalvando]       = useState(false);
  const [msg, setMsg]                 = useState("");
  const [emailConteudo, setEmailConteudo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: sol }, { data: cons }] = await Promise.all([
      supabase
        .from("lgpd_solicitacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("lgpd_consentimentos")
        .select("id, aceito_essencial, aceito_analytics, aceito_marketing, versao_politica, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    setSolic((sol ?? []) as Solicitacao[]);
    setCons((cons ?? []) as Consentimento[]);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function abrirSolicitacao(s: Solicitacao) {
    setSelecionada(s);
    setStatus(s.status);
    setResposta(s.resposta ?? "");
    setMsg("");
    setEmailConteudo(null);
  }

  function aplicarTemplate(tipo: string) {
    setResposta(TEMPLATES[tipo] ?? "");
  }

  async function salvarResposta() {
    if (!selecionada) return;
    setSalvando(true);
    setMsg("Salvando...");

    const res = await fetch("/api/admin/lgpd/responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selecionada.id, status, resposta }),
    });
    const json = await res.json() as { ok: boolean; email_enviado?: boolean; conteudo_email?: string | null; error?: string };

    setSalvando(false);
    if (!json.ok) {
      setMsg(`Erro: ${json.error ?? "desconhecido"}`);
      return;
    }

    if (json.email_enviado) {
      setMsg("Salvo e e-mail enviado ao titular.");
    } else if (json.conteudo_email) {
      setMsg("Salvo. E-mail não configurado — copie o texto abaixo:");
      setEmailConteudo(json.conteudo_email);
    } else {
      setMsg("Salvo.");
    }

    void carregar();
  }

  function exportarCSV() {
    const bom = "﻿";
    const rows = solicitacoesFiltradas.map((s) => [
      s.nome, s.email,
      TIPO_LABEL[s.tipo] ?? s.tipo,
      STATUS_LABEL[s.status] ?? s.status,
      new Date(s.created_at).toLocaleDateString("pt-BR"),
      s.respondida_em ? new Date(s.respondida_em).toLocaleDateString("pt-BR") : "",
      diasDesde(s.created_at),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");

    const csv = bom + "Nome,E-mail,Tipo,Status,Recebida em,Respondida em,Dias desde recebimento\r\n" + rows;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lgpd-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Métricas
  const pendentes     = solicitacoes.filter((s) => s.status === "pendente");
  const concluidas    = solicitacoes.filter((s) => s.status === "concluida");
  const vencidas      = pendentes.filter((s) => diasDesde(s.created_at) >= SLA_DIAS);
  const emRisco       = pendentes.filter((s) => {
    const d = diasDesde(s.created_at);
    return d >= SLA_DIAS - 5 && d < SLA_DIAS;
  });
  const taxaConclusao = solicitacoes.length > 0
    ? Math.round((concluidas.length / solicitacoes.length) * 100)
    : 100;

  // Filtros aplicados
  const solicitacoesFiltradas = solicitacoes.filter((s) => {
    if (filtroStatus && s.status !== filtroStatus) return false;
    if (filtroTipo   && s.tipo   !== filtroTipo)   return false;
    return true;
  });

  return (
    <div style={sx.wrap}>
      <div style={sx.pageHeader}>
        <div>
          <h1 style={sx.titulo}>LGPD — Privacidade e Dados</h1>
          <p style={sx.sub}>
            Gerencie solicitações de titulares com prazo legal de {SLA_DIAS} dias (Lei 13.709/2018).
          </p>
        </div>
        {aba === "solicitacoes" && (
          <button style={sx.btnExport} onClick={exportarCSV} disabled={solicitacoesFiltradas.length === 0}>
            ⬇ Exportar CSV ({solicitacoesFiltradas.length})
          </button>
        )}
      </div>

      {/* Métricas de conformidade */}
      {!loading && aba === "solicitacoes" && (
        <div style={sx.metricas}>
          {[
            { label: "Total",         valor: solicitacoes.length, cor: "#93c5fd" },
            { label: "Pendentes",     valor: pendentes.length,    cor: "#fde047" },
            { label: "Prazo em risco",valor: emRisco.length,      cor: "#fb923c" },
            { label: "Prazo vencido", valor: vencidas.length,     cor: "#fca5a5" },
            { label: "Concluídas",    valor: concluidas.length,   cor: "#86efac" },
          ].map((m) => (
            <div key={m.label} style={sx.metricaCard}>
              <span style={{ ...sx.metricaNum, color: m.cor }}>{m.valor}</span>
              <span style={sx.metricaLabel}>{m.label}</span>
            </div>
          ))}
          <div style={{ ...sx.metricaCard, minWidth: 110 }}>
            <div style={{ position: "relative", width: 52, height: 52, margin: "0 auto" }}>
              <svg viewBox="0 0 36 36" style={{ width: 52, height: 52, transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={taxaConclusao >= 80 ? "#86efac" : taxaConclusao >= 50 ? "#fde047" : "#fca5a5"}
                  strokeWidth="3"
                  strokeDasharray={`${taxaConclusao} ${100 - taxaConclusao}`}
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#f1f5f9" }}>
                {taxaConclusao}%
              </span>
            </div>
            <span style={{ ...sx.metricaLabel, marginTop: 4 }}>Conclusão</span>
          </div>
        </div>
      )}

      {/* Abas */}
      <div style={sx.abas}>
        <button
          style={{ ...sx.aba, ...(aba === "solicitacoes" ? sx.abaAtiva : {}) }}
          onClick={() => setAba("solicitacoes")}
        >
          Solicitações LGPD
          {pendentes.length > 0 && <span style={sx.badge}>{pendentes.length}</span>}
        </button>
        <button
          style={{ ...sx.aba, ...(aba === "consentimentos" ? sx.abaAtiva : {}) }}
          onClick={() => setAba("consentimentos")}
        >
          Consentimentos ({consentimentos.length})
        </button>
      </div>

      {loading ? (
        <p style={sx.empty}>Carregando...</p>
      ) : aba === "solicitacoes" ? (
        <>
          {/* Filtros */}
          <div style={sx.filtros}>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={sx.select}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={sx.select}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Modal de resposta */}
          {selecionada && (
            <div style={sx.overlay} onClick={() => setSelecionada(null)}>
              <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
                <div style={sx.modalHeader}>
                  <h2 style={sx.modalTitulo}>Responder Solicitação LGPD</h2>
                  <button type="button" style={sx.modalClose} onClick={() => setSelecionada(null)}>✕</button>
                </div>

                <div style={sx.solInfo}>
                  <div style={sx.solInfoRow}>
                    <span style={sx.infoLabel}>Titular</span>
                    <span style={sx.infoVal}>{selecionada.nome} — {selecionada.email}</span>
                  </div>
                  <div style={sx.solInfoRow}>
                    <span style={sx.infoLabel}>Tipo</span>
                    <span style={sx.infoVal}>{TIPO_LABEL[selecionada.tipo] ?? selecionada.tipo}</span>
                  </div>
                  <div style={sx.solInfoRow}>
                    <span style={sx.infoLabel}>Recebida</span>
                    <span style={sx.infoVal}>
                      {new Date(selecionada.created_at).toLocaleDateString("pt-BR")}
                      {" "}<span style={slaEstilo(diasDesde(selecionada.created_at))}>
                        ({slaLabel(diasDesde(selecionada.created_at))})
                      </span>
                    </span>
                  </div>
                  {selecionada.mensagem && (
                    <div style={{ ...sx.solInfoRow, flexDirection: "column", gap: 4 }}>
                      <span style={sx.infoLabel}>Mensagem do titular</span>
                      <span style={{ ...sx.infoVal, fontStyle: "italic", color: "#64748b" }}>{selecionada.mensagem}</span>
                    </div>
                  )}
                </div>

                <label style={sx.labelModal}>
                  Status
                  <select value={status} onChange={(e) => setStatus(e.target.value as Status)} style={sx.inputModal}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>

                {/* Templates */}
                <div style={sx.templateRow}>
                  <span style={sx.templateLabel}>Templates de resposta:</span>
                  {Object.entries(TIPO_LABEL).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      style={{ ...sx.templateBtn, ...(selecionada.tipo === v ? sx.templateBtnAtivo : {}) }}
                      onClick={() => aplicarTemplate(v)}
                    >
                      {l.replace(" de dados", "").replace(" ao tratamento", "")}
                    </button>
                  ))}
                </div>

                <label style={sx.labelModal}>
                  Resposta ao titular
                  <span style={{ fontSize: 11, color: "#475569", marginLeft: 6, fontWeight: 400 }}>
                    (será enviada por e-mail se o SMTP estiver configurado)
                  </span>
                  <textarea
                    rows={6}
                    value={resposta}
                    onChange={(e) => setResposta(e.target.value)}
                    style={sx.textareaModal}
                    placeholder="Descreva a decisão e o encaminhamento dado à solicitação..."
                  />
                </label>

                <div style={sx.modalFooter}>
                  <button style={sx.btnSalvar} onClick={() => void salvarResposta()} disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar e notificar"}
                  </button>
                  <button style={sx.btnCancelar} onClick={() => setSelecionada(null)}>Cancelar</button>
                  {msg && <span style={{ fontSize: 13, color: msg.startsWith("Erro") ? "#fca5a5" : "#86efac" }}>{msg}</span>}
                </div>

                {/* Conteúdo do e-mail para cópia manual */}
                {emailConteudo && (
                  <div style={sx.emailBox}>
                    <div style={sx.emailBoxHeader}>
                      E-mail para envio manual — copie e envie ao titular:
                    </div>
                    <pre style={sx.emailPre}>{emailConteudo}</pre>
                    <button
                      type="button"
                      style={sx.btnCopiar}
                      onClick={() => { void navigator.clipboard.writeText(emailConteudo); }}
                    >
                      Copiar texto
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabela de solicitações */}
          {solicitacoesFiltradas.length === 0 ? (
            <p style={sx.empty}>Nenhuma solicitação encontrada com os filtros atuais.</p>
          ) : (
            <div className="admin-table-grid-wrap" style={sx.tabela}>
              <div style={{ ...sx.tabelaHeader, minWidth: 680 }}>
                <span>Titular</span>
                <span>Tipo</span>
                <span>Status</span>
                <span>SLA</span>
                <span>Recebida</span>
                <span style={{ textAlign: "right" }}>Ação</span>
              </div>
              {solicitacoesFiltradas.map((sol) => {
                const dias = diasDesde(sol.created_at);
                const isPendente = sol.status === "pendente" || sol.status === "em_andamento";
                return (
                  <div key={sol.id} style={{ ...sx.tabelaRow, minWidth: 680 }}>
                    <div>
                      <div style={sx.nome}>{sol.nome}</div>
                      <div style={sx.obs}>{sol.email}</div>
                    </div>
                    <div style={sx.obs}>{TIPO_LABEL[sol.tipo] ?? sol.tipo}</div>
                    <div>
                      <span style={{ ...sx.chip, ...STATUS_ESTILO[sol.status] }}>
                        {STATUS_LABEL[sol.status]}
                      </span>
                    </div>
                    <div>
                      {isPendente ? (
                        <span style={{ ...sx.slaChip, ...slaEstilo(dias) }}>
                          {slaLabel(dias)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#334155" }}>—</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {new Date(sol.created_at).toLocaleDateString("pt-BR")}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button style={sx.btnVer} onClick={() => abrirSolicitacao(sol)}>
                        Responder
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Aba de consentimentos */
        <>
          <div style={sx.consStats}>
            {[
              { label: "Total registros",  valor: consentimentos.length },
              { label: "Aceitam Analytics",valor: consentimentos.filter((c) => c.aceito_analytics).length },
              { label: "Aceitam Marketing",valor: consentimentos.filter((c) => c.aceito_marketing).length },
            ].map((m) => (
              <div key={m.label} style={sx.consStatCard}>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#93c5fd" }}>{m.valor}</span>
                <span style={sx.metricaLabel}>{m.label}</span>
              </div>
            ))}
          </div>

          <div className="admin-table-grid-wrap" style={sx.tabela}>
            <div style={{ ...sx.tabelaHeader, gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", minWidth: 520 }}>
              <span>Essencial</span>
              <span>Analytics</span>
              <span>Marketing</span>
              <span>Versão</span>
              <span>Data</span>
            </div>
            {consentimentos.length === 0 ? (
              <p style={sx.empty}>Nenhum consentimento registrado.</p>
            ) : consentimentos.map((c) => (
              <div key={c.id} style={{ ...sx.tabelaRow, gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", minWidth: 520 }}>
                <Bool v={c.aceito_essencial} />
                <Bool v={c.aceito_analytics} />
                <Bool v={c.aceito_marketing} />
                <span style={sx.obs}>{c.versao_politica}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Bool({ v }: { v: boolean }) {
  return (
    <span style={{ color: v ? "#86efac" : "#475569", fontWeight: 700, fontSize: 12 }}>
      {v ? "✓ Sim" : "✗ Não"}
    </span>
  );
}

const sx: Record<string, React.CSSProperties> = {
  wrap:         { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo:       { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:          { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  btnExport:    { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  metricas:     { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 },
  metricaCard:  { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 12, padding: "12px 18px", display: "flex", flexDirection: "column", gap: 2, minWidth: 90, alignItems: "center", textAlign: "center" },
  metricaNum:   { fontSize: 26, fontWeight: 900, lineHeight: 1 },
  metricaLabel: { fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  abas:         { display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid rgba(148,163,184,0.1)", paddingBottom: 6 },
  aba:          { padding: "7px 16px", borderRadius: "8px 8px 0 0", border: "1px solid rgba(148,163,184,0.15)", background: "transparent", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 },
  abaAtiva:     { background: "rgba(29,78,216,0.15)", color: "#93c5fd", borderColor: "#1e40af" },
  badge:        { background: "#dc2626", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 900, padding: "1px 6px", minWidth: 18, textAlign: "center" as const },
  filtros:      { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  select:       { padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal:        { background: "#0f172a", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 18, padding: "24px 28px", width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto" },
  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  modalTitulo:  { margin: 0, fontSize: 17, fontWeight: 800, color: "#f1f5f9" },
  modalClose:   { background: "transparent", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer" },
  solInfo:      { background: "rgba(2,6,23,0.5)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 10, padding: "14px 16px", marginBottom: 18, display: "flex", flexDirection: "column", gap: 8 },
  solInfoRow:   { display: "flex", gap: 12, alignItems: "baseline" },
  infoLabel:    { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, minWidth: 70, flexShrink: 0 },
  infoVal:      { fontSize: 13, color: "#e2e8f0" },
  templateRow:  { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 },
  templateLabel:{ fontSize: 11, color: "#475569", fontWeight: 700 },
  templateBtn:  { padding: "3px 9px", borderRadius: 7, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  templateBtnAtivo: { background: "rgba(29,78,216,0.2)", color: "#93c5fd", borderColor: "#1e40af" },
  labelModal:   { fontSize: 12, fontWeight: 600, color: "#64748b", display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 },
  inputModal:   { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  textareaModal:{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13, resize: "vertical", minHeight: 120, fontFamily: "inherit" },
  modalFooter:  { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  btnSalvar:    { padding: "10px 20px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnCancelar:  { padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  emailBox:     { marginTop: 18, background: "rgba(2,6,23,0.7)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10, padding: 16 },
  emailBoxHeader:{ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase" as const, marginBottom: 8, letterSpacing: "0.07em" },
  emailPre:     { fontSize: 11, color: "#94a3b8", whiteSpace: "pre-wrap" as const, margin: 0, lineHeight: 1.7, fontFamily: "monospace" },
  btnCopiar:    { marginTop: 10, padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  tabela:       { background: "rgba(15,23,42,0.7)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 14 },
  tabelaHeader: { display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.8fr 0.7fr", gap: 12, padding: "10px 16px", background: "rgba(2,6,23,0.6)", fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  tabelaRow:    { display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 0.8fr 0.7fr", gap: 12, padding: "12px 16px", borderTop: "1px solid rgba(148,163,184,0.07)", alignItems: "center" },
  nome:         { fontSize: 13, fontWeight: 700, color: "#e2e8f0" },
  obs:          { fontSize: 11, color: "#64748b", marginTop: 2 },
  chip:         { padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, display: "inline-flex" },
  slaChip:      { fontSize: 11, padding: "2px 6px", borderRadius: 6, background: "transparent" },
  btnVer:       { padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(29,78,216,0.4)", background: "rgba(29,78,216,0.12)", color: "#93c5fd", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  empty:        { color: "#475569", textAlign: "center" as const, padding: "40px 0" },
  consStats:    { display: "flex", gap: 10, marginBottom: 16 },
  consStatCard: { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 12, padding: "12px 18px", display: "flex", flexDirection: "column", gap: 2, minWidth: 120, alignItems: "center" },
};
