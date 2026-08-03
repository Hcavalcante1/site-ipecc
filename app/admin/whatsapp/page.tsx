"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  labelConversationState,
  formatWaIdDisplay,
} from "@/lib/whatsapp/stateLabels";
import {
  PUBLIC_WHATSAPP_SUBJECT_OPTIONS,
  getWhatsAppSubjectLabel,
} from "@/lib/whatsapp/publicWhatsApp";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "leads" | "atendimentos" | "configuracao";

type Lead = {
  id: string;
  created_at: string;
  nome: string;
  organizacao: string | null;
  telefone: string;
  email: string | null;
  assunto: string;
  mensagem: string | null;
  pagina_origem: string | null;
};

type Conversa = {
  wa_id: string;
  state: string;
  unknown_count: number;
  from_site_hint: boolean;
  human_assigned_to: string | null;
  last_message_at: string;
  updated_at: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const STATE_COR: Record<string, { bg: string; borda: string; cor: string }> = {
  handoff:            { bg: "rgba(220,38,38,0.12)",  borda: "#dc2626", cor: "#fca5a5" },
  idle:               { bg: "rgba(71,85,105,0.12)",  borda: "#475569", cor: "#94a3b8" },
  menu:               { bg: "rgba(29,78,216,0.12)",  borda: "#1d4ed8", cor: "#93c5fd" },
  closed:             { bg: "rgba(22,101,52,0.12)",  borda: "#166534", cor: "#86efac" },
  topic_projetos:     { bg: "rgba(124,58,237,0.12)", borda: "#7c3aed", cor: "#c4b5fd" },
  topic_editais:      { bg: "rgba(180,83,9,0.12)",   borda: "#b45309", cor: "#fde68a" },
  topic_propostas:    { bg: "rgba(6,95,70,0.12)",    borda: "#065f46", cor: "#6ee7b7" },
  topic_transparencia:{ bg: "rgba(3,105,161,0.12)",  borda: "#0369a1", cor: "#7dd3fc" },
  topic_eventos:      { bg: "rgba(157,23,77,0.12)",  borda: "#9d174d", cor: "#f9a8d4" },
};

function stateCor(state: string) {
  return STATE_COR[state] ?? { bg: "rgba(71,85,105,0.12)", borda: "#475569", cor: "#94a3b8" };
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function semanaAtras(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WhatsAppAdminPage() {
  const [tab, setTab] = useState<Tab>("leads");

  // Leads state
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads]      = useState(0);
  const [leadsPage, setLeadsPage]        = useState(0);
  const [busca, setBusca]               = useState("");
  const buscaReal                       = useRef("");
  const buscaTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filtroAssunto, setFiltroAssunto] = useState("");
  const [filtroInicio, setFiltroInicio]  = useState("");
  const [filtroFim, setFiltroFim]        = useState("");
  const [loadingLeads, setLoadingLeads]  = useState(true);
  const [avisoLeads, setAvisoLeads]     = useState<string | null>(null);
  const [persistAtiva, setPersistAtiva] = useState(false);
  const [realtimeBanner, setRealtimeBanner] = useState(false);

  // Atendimentos state
  const [conversas, setConversas]           = useState<Conversa[]>([]);
  const [filtroState, setFiltroState]       = useState("");
  const [loadingConv, setLoadingConv]       = useState(true);
  const [avisoConv, setAvisoConv]           = useState<string | null>(null);
  const [atribuindo, setAtribuindo]         = useState<string | null>(null);
  const [atribValue, setAtribValue]         = useState("");
  const [encerrandoId, setEncerrandoId]     = useState<string | null>(null);
  const [convPage, setConvPage]             = useState(0);
  const [realtimeConvBanner, setRealtimeConvBanner] = useState(false);

  // ── Leads loader ──────────────────────────────────────────────────────────

  const carregarLeads = useCallback(async (page = 0) => {
    setLoadingLeads(true);
    const qs = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
    if (buscaReal.current) qs.set("q", buscaReal.current);
    if (filtroAssunto)     qs.set("assunto", filtroAssunto);
    if (filtroInicio)      qs.set("inicio", filtroInicio);
    if (filtroFim)         qs.set("fim", filtroFim);

    const res  = await fetch(`/api/admin/whatsapp/leads?${qs}`);
    const json = await res.json() as { ok: boolean; leads?: Lead[]; total?: number; persistenciaAtiva?: boolean; aviso?: string | null; error?: string };

    setLoadingLeads(false);
    if (!json.ok) { setAvisoLeads(json.error ?? "Erro"); return; }
    if (page === 0) setLeads(json.leads ?? []);
    else setLeads((prev) => [...prev, ...(json.leads ?? [])]);
    setTotalLeads(json.total ?? json.leads?.length ?? 0);
    setPersistAtiva(json.persistenciaAtiva ?? false);
    setAvisoLeads(json.aviso ?? null);
  }, [filtroAssunto, filtroInicio, filtroFim]);

  // ── Atendimentos loader ───────────────────────────────────────────────────

  const carregarConversas = useCallback(async (page = 0) => {
    setLoadingConv(true);
    const qs = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
    if (filtroState) qs.set("state", filtroState);

    const res  = await fetch(`/api/admin/whatsapp/conversations?${qs}`);
    const json = await res.json() as { ok: boolean; conversations?: Conversa[]; aviso?: string | null; error?: string };

    setLoadingConv(false);
    if (!json.ok) { setAvisoConv(json.error ?? "Erro"); return; }
    if (page === 0) setConversas(json.conversations ?? []);
    else setConversas((prev) => [...prev, ...(json.conversations ?? [])]);
    setAvisoConv(json.aviso ?? null);
  }, [filtroState]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (tab === "leads")         { setLeadsPage(0); void carregarLeads(0); }
    else if (tab === "atendimentos") { setConvPage(0); void carregarConversas(0); }
  }, [tab, carregarLeads, carregarConversas]);

  // Realtime — leads
  useEffect(() => {
    const ch = supabase
      .channel("admin_whatsapp_leads_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_leads" }, () => {
        setRealtimeBanner(true);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  // Realtime — conversas
  useEffect(() => {
    const ch = supabase
      .channel("admin_whatsapp_conv_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => {
        setRealtimeConvBanner(true);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  // ── Busca debounced ───────────────────────────────────────────────────────

  function onBuscaChange(v: string) {
    setBusca(v);
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(() => {
      buscaReal.current = v;
      setLeadsPage(0);
      void carregarLeads(0);
    }, 400);
  }

  // ── Atribuir ──────────────────────────────────────────────────────────────

  async function atribuir(waId: string) {
    const human = atribValue.trim();
    if (!human) return;
    const res  = await fetch("/api/admin/whatsapp/conversations", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wa_id: waId, human_assigned_to: human }),
    });
    const json = await res.json() as { ok: boolean; error?: string };
    if (!json.ok) { setAvisoConv(json.error ?? "Erro ao atribuir"); return; }
    setAtribuindo(null); setAtribValue("");
    void carregarConversas(0);
  }

  // ── Encerrar ──────────────────────────────────────────────────────────────

  async function encerrar(waId: string) {
    setEncerrandoId(waId);
    const res  = await fetch("/api/admin/whatsapp/conversations", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wa_id: waId, state: "closed" }),
    });
    const json = await res.json() as { ok: boolean; error?: string };
    setEncerrandoId(null);
    if (!json.ok) { setAvisoConv(json.error ?? "Erro ao encerrar"); return; }
    void carregarConversas(0);
  }

  // ── Export CSV ────────────────────────────────────────────────────────────

  function exportarCSV() {
    if (!leads.length) return;
    const cab  = ["Data", "Nome", "Organização", "Telefone", "Email", "Assunto", "Mensagem", "Origem"];
    const rows = leads.map((l) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.nome, l.organizacao ?? "", l.telefone, l.email ?? "",
      getWhatsAppSubjectLabel(l.assunto), l.mensagem ?? "", l.pagina_origem ?? "",
    ]);
    const csv = "﻿" + [cab, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url;
    a.download = `leads-whatsapp-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  const hojeStr    = hoje();
  const semanaStr  = semanaAtras();
  const leadsHoje  = leads.filter((l) => l.created_at.slice(0, 10) === hojeStr).length;
  const leadsSemana = leads.filter((l) => l.created_at.slice(0, 10) >= semanaStr).length;
  const convHandoff = conversas.filter((c) => c.state === "handoff").length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      {/* Cabeçalho */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>WhatsApp</h1>
          <p style={s.sub}>Leads do formulário do site e atendimentos via WhatsApp Business API.</p>
        </div>
        <button
          style={s.btnRefresh}
          onClick={() => tab === "leads" ? void carregarLeads(0) : void carregarConversas(0)}
          disabled={tab === "leads" ? loadingLeads : loadingConv}
        >
          {(tab === "leads" ? loadingLeads : loadingConv) ? "⟳ Atualizando..." : "⟳ Atualizar"}
        </button>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label: "Total de leads", valor: totalLeads,   cor: "#93c5fd" },
          { label: "Hoje",           valor: leadsHoje,     cor: "#86efac" },
          { label: "Esta semana",    valor: leadsSemana,   cor: "#c4b5fd" },
          { label: "Aguardando equipe", valor: convHandoff, cor: "#fca5a5" },
        ].map((st) => (
          <div key={st.label} style={s.statCard}>
            <div style={{ ...s.statNum, color: st.cor }}>{st.valor}</div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabRow}>
        {(["leads", "atendimentos", "configuracao"] as Tab[]).map((t) => (
          <button key={t} style={{ ...s.tabBtn, ...(tab === t ? s.tabBtnAtivo : {}) }} onClick={() => setTab(t)}>
            {t === "leads" ? "💬 Leads" : t === "atendimentos" ? "🎧 Atendimentos" : "⚙️ Configuração"}
          </button>
        ))}
      </div>

      {/* ── LEADS ──────────────────────────────────────────────────────────── */}
      {tab === "leads" && (
        <>
          {/* Realtime banner */}
          {realtimeBanner && (
            <div style={s.realtimeBanner}>
              Novo lead recebido.{" "}
              <button style={s.realtimeBtn} onClick={() => { setRealtimeBanner(false); void carregarLeads(0); }}>
                Atualizar lista →
              </button>
            </div>
          )}

          {!persistAtiva && (
            <div style={s.avisoPersist}>
              Persistência desligada (<code>WHATSAPP_LEADS_PERSIST_SUPABASE≠1</code>). O formulário público ainda abre o WhatsApp, mas os leads não são gravados no banco.
            </div>
          )}

          {/* Filtros */}
          <div style={s.filtrosWrap}>
            <input
              placeholder="Buscar nome, telefone ou e-mail…"
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              style={s.inputFiltro}
            />
            <select value={filtroAssunto} onChange={(e) => { setFiltroAssunto(e.target.value); setLeadsPage(0); void carregarLeads(0); }} style={s.selectFiltro}>
              <option value="">Todos os assuntos</option>
              {PUBLIC_WHATSAPP_SUBJECT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <input type="date" value={filtroInicio} onChange={(e) => { setFiltroInicio(e.target.value); setLeadsPage(0); void carregarLeads(0); }} style={s.inputFiltro} title="Data início" />
            <input type="date" value={filtroFim}    onChange={(e) => { setFiltroFim(e.target.value);    setLeadsPage(0); void carregarLeads(0); }} style={s.inputFiltro} title="Data fim" />
            {(busca || filtroAssunto || filtroInicio || filtroFim) && (
              <button style={s.btnLimpar} onClick={() => { setBusca(""); buscaReal.current = ""; setFiltroAssunto(""); setFiltroInicio(""); setFiltroFim(""); setLeadsPage(0); void carregarLeads(0); }}>
                ✕ Limpar
              </button>
            )}
            <div style={{ flex: 1 }} />
            {leads.length > 0 && (
              <button style={s.btnExport} onClick={exportarCSV}>
                ↓ CSV ({leads.length})
              </button>
            )}
          </div>

          {avisoLeads && <div style={s.avisoBox}>{avisoLeads}</div>}

          {loadingLeads && leads.length === 0 ? (
            <p style={s.empty}>Carregando leads…</p>
          ) : leads.length === 0 ? (
            <p style={s.empty}>Nenhum lead encontrado.</p>
          ) : (
            <>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr style={s.theadTr}>
                      {["Data", "Contato", "Assunto", "Mensagem", "Origem"].map((h) => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id} style={s.tr}>
                        <td style={{ ...s.td, whiteSpace: "nowrap", color: "#64748b", fontSize: 12 }}>
                          {new Date(l.created_at).toLocaleDateString("pt-BR")}<br />
                          <span style={{ fontSize: 11 }}>{new Date(l.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13 }}>{l.nome}</div>
                          {l.organizacao && <div style={{ fontSize: 11, color: "#64748b" }}>{l.organizacao}</div>}
                          <div style={{ fontSize: 12, color: "#93c5fd" }}>{formatWaIdDisplay(l.telefone)}</div>
                          {l.email && <div style={{ fontSize: 11, color: "#94a3b8" }}>{l.email}</div>}
                        </td>
                        <td style={s.td}>
                          <span style={s.assuntoChip}>{getWhatsAppSubjectLabel(l.assunto)}</span>
                        </td>
                        <td style={{ ...s.td, maxWidth: 260, fontSize: 12, color: "#94a3b8" }}>
                          {l.mensagem ? (
                            <span title={l.mensagem}>
                              {l.mensagem.length > 100 ? `${l.mensagem.slice(0, 100)}…` : l.mensagem}
                            </span>
                          ) : <em style={{ color: "#334155" }}>sem mensagem</em>}
                        </td>
                        <td style={{ ...s.td, fontSize: 11, color: "#475569" }}>
                          {l.pagina_origem ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {leads.length < totalLeads && (
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button
                    style={s.btnCarregarMais}
                    disabled={loadingLeads}
                    onClick={() => { const np = leadsPage + 1; setLeadsPage(np); void carregarLeads(np); }}
                  >
                    {loadingLeads ? "Carregando…" : `Carregar mais (${leads.length} de ${totalLeads})`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── ATENDIMENTOS ────────────────────────────────────────────────────── */}
      {tab === "atendimentos" && (
        <>
          {realtimeConvBanner && (
            <div style={s.realtimeBanner}>
              Conversa atualizada.{" "}
              <button style={s.realtimeBtn} onClick={() => { setRealtimeConvBanner(false); void carregarConversas(0); }}>
                Atualizar →
              </button>
            </div>
          )}

          {/* Filtros */}
          <div style={s.filtrosWrap}>
            <select value={filtroState} onChange={(e) => { setFiltroState(e.target.value); setConvPage(0); void carregarConversas(0); }} style={s.selectFiltro}>
              <option value="">Todos os estados</option>
              <option value="handoff">Aguardando equipe</option>
              <option value="idle">Inativo</option>
              <option value="menu">Menu principal</option>
              <option value="closed">Encerrada</option>
              <option value="topic_projetos">Tópico — Projetos</option>
              <option value="topic_editais">Tópico — Editais</option>
              <option value="topic_propostas">Tópico — Propostas</option>
              <option value="topic_transparencia">Tópico — Transparência</option>
              <option value="topic_eventos">Tópico — Eventos</option>
            </select>
            {filtroState && (
              <button style={s.btnLimpar} onClick={() => { setFiltroState(""); setConvPage(0); void carregarConversas(0); }}>✕ Limpar</button>
            )}
          </div>

          {avisoConv && <div style={s.avisoBox}>{avisoConv}</div>}

          {loadingConv && conversas.length === 0 ? (
            <p style={s.empty}>Carregando atendimentos…</p>
          ) : conversas.length === 0 ? (
            <p style={s.empty}>Nenhuma conversa encontrada.</p>
          ) : (
            <div style={s.convGrid}>
              {conversas.map((c) => {
                const cor = stateCor(c.state);
                return (
                  <div key={c.wa_id} style={{ ...s.convCard, borderColor: `${cor.borda}44`, background: cor.bg }}>
                    <div style={s.convTop}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...s.convWaId, color: "#f1f5f9" }}>{formatWaIdDisplay(c.wa_id)}</div>
                        <span style={{ ...s.stateChip, color: cor.cor, borderColor: `${cor.borda}66`, background: `${cor.borda}22` }}>
                          {labelConversationState(c.state)}
                        </span>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 11, color: "#475569" }}>
                        {tempoRelativo(c.last_message_at)}
                      </div>
                    </div>

                    {c.human_assigned_to && (
                      <div style={s.convAtrib}>
                        Responsável: <strong style={{ color: "#c4b5fd" }}>{c.human_assigned_to}</strong>
                      </div>
                    )}

                    {c.from_site_hint && (
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Veio pelo site</div>
                    )}

                    {/* Atribuição inline */}
                    {atribuindo === c.wa_id ? (
                      <div style={s.atribRow}>
                        <input
                          placeholder="E-mail do responsável"
                          value={atribValue}
                          onChange={(e) => setAtribValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") void atribuir(c.wa_id); if (e.key === "Escape") { setAtribuindo(null); setAtribValue(""); } }}
                          style={s.inputAtrib}
                          autoFocus
                        />
                        <button style={s.btnAtrib} onClick={() => void atribuir(c.wa_id)}>Salvar</button>
                        <button style={s.btnAtribCancel} onClick={() => { setAtribuindo(null); setAtribValue(""); }}>✕</button>
                      </div>
                    ) : (
                      <div style={s.convAcoes}>
                        <button style={s.btnAcao} onClick={() => { setAtribuindo(c.wa_id); setAtribValue(c.human_assigned_to ?? ""); }}>
                          {c.human_assigned_to ? "Reatribuir" : "Atribuir"}
                        </button>
                        {c.state !== "closed" && (
                          <button
                            style={{ ...s.btnAcao, color: "#fca5a5", borderColor: "#7f1d1d44" }}
                            disabled={encerrandoId === c.wa_id}
                            onClick={() => void encerrar(c.wa_id)}
                          >
                            {encerrandoId === c.wa_id ? "Encerrando…" : "Encerrar"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {conversas.length >= PAGE_SIZE && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                style={s.btnCarregarMais}
                disabled={loadingConv}
                onClick={() => { const np = convPage + 1; setConvPage(np); void carregarConversas(np); }}
              >
                {loadingConv ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── CONFIGURAÇÃO ────────────────────────────────────────────────────── */}
      {tab === "configuracao" && (
        <div style={s.configWrap}>
          <div style={s.configCard}>
            <h2 style={s.configTitulo}>💬 WhatsApp Business API</h2>
            <p style={s.configDesc}>
              O bot WhatsApp usa a Cloud API da Meta para receber e responder mensagens automaticamente.
              Configure as variáveis de ambiente abaixo na Vercel (ou <code>.env.local</code> em dev) e faça redeploy.
            </p>

            <div style={s.configVarList}>
              {[
                { chave: "WHATSAPP_API_URL",   label: "URL da API",     desc: "Ex: https://graph.facebook.com/v19.0/<PHONE_ID>/messages" },
                { chave: "WHATSAPP_API_TOKEN", label: "Token de acesso", desc: "Bearer token permanente gerado no painel Meta Developers" },
              ].map((v) => (
                <div key={v.chave} style={s.configVar}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <code style={s.configVarChave}>{v.chave}</code>
                    <span style={s.configVarLabel}>{v.label}</span>
                  </div>
                  <div style={s.configVarDesc}>{v.desc}</div>
                </div>
              ))}
            </div>

            <div style={s.configSeparator} />

            <h3 style={s.configSubtitulo}>Persistência de Leads</h3>
            <p style={s.configDesc}>
              Para gravar os leads do formulário público no banco de dados, ative a variável abaixo e aplique o script SQL da tabela <code>whatsapp_leads</code>.
            </p>
            <div style={s.configVar}>
              <code style={s.configVarChave}>WHATSAPP_LEADS_PERSIST_SUPABASE</code>
              <div style={s.configVarDesc}>Defina como <code>1</code> para ativar a gravação de leads.</div>
            </div>

            <div style={s.configSeparator} />

            <h3 style={s.configSubtitulo}>Número público</h3>
            <p style={s.configDesc}>
              Configure o número WhatsApp Business da organização como variável de ambiente.
            </p>
            <div style={s.configVar}>
              <code style={s.configVarChave}>NEXT_PUBLIC_WHATSAPP_NUMBER</code>
              <div style={s.configVarDesc}>Número no formato internacional: Ex. <code>5511999990000</code></div>
            </div>

            <div style={{ marginTop: 20 }}>
              <a href="/admin/configuracoes" style={s.linkConfig}>
                Ver todas as integrações →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap:           { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo:         { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:            { margin: "6px 0 0", color: "#64748b", fontSize: 13 },
  btnRefresh:     { padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },

  statsRow:   { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
  statCard:   { flex: "1 1 150px", background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 14, padding: "14px 18px" },
  statNum:    { fontSize: 28, fontWeight: 900, lineHeight: 1, marginBottom: 4 },
  statLabel:  { fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },

  tabRow:     { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  tabBtn:     { padding: "9px 18px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  tabBtnAtivo:{ background: "rgba(29,78,216,0.2)", borderColor: "#1d4ed855", color: "#93c5fd" },

  realtimeBanner: { background: "rgba(22,101,52,0.15)", border: "1px solid #166534", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#86efac", display: "flex", gap: 12, alignItems: "center" },
  realtimeBtn:    { background: "none", border: "none", color: "#86efac", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 },

  avisoPersist: { background: "rgba(120,53,15,0.2)", border: "1px solid #92400e", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#fde68a", lineHeight: 1.6 },
  avisoBox:     { background: "rgba(127,29,29,0.15)", border: "1px solid #7f1d1d", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 12, color: "#fca5a5" },

  filtrosWrap:  { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" },
  inputFiltro:  { flex: "1 1 200px", padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  selectFiltro: { flex: "0 0 auto", padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(2,6,23,0.9)", color: "#e2e8f0", fontSize: 13 },
  btnLimpar:    { padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnExport:    { padding: "8px 16px", borderRadius: 9, border: "1px solid #166534", background: "rgba(22,101,52,0.15)", color: "#86efac", fontSize: 12, fontWeight: 700, cursor: "pointer" },

  tableWrap:    { overflowX: "auto" as const },
  table:        { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  theadTr:      { borderBottom: "1px solid rgba(148,163,184,0.15)" },
  th:           { padding: "10px 12px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  tr:           { borderBottom: "1px solid rgba(15,23,42,0.8)" },
  td:           { padding: "12px 12px", verticalAlign: "top" as const },

  assuntoChip:  { fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(29,78,216,0.15)", border: "1px solid #1d4ed855", color: "#93c5fd" },

  btnCarregarMais: { padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" },

  convGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 },
  convCard:   { border: "1px solid", borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 },
  convTop:    { display: "flex", gap: 10, alignItems: "flex-start" },
  convWaId:   { fontSize: 14, fontWeight: 800, marginBottom: 4 },
  stateChip:  { fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, border: "1px solid", display: "inline-block", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  convAtrib:  { fontSize: 12, color: "#64748b" },
  convAcoes:  { display: "flex", gap: 8, marginTop: 4 },
  btnAcao:    { padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },

  atribRow:       { display: "flex", gap: 6, alignItems: "center", marginTop: 4 },
  inputAtrib:     { flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", background: "rgba(2,6,23,0.8)", color: "#e2e8f0", fontSize: 12 },
  btnAtrib:       { padding: "6px 12px", borderRadius: 8, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnAtribCancel: { padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer" },

  configWrap:      { maxWidth: 680 },
  configCard:      { background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "24px 28px" },
  configTitulo:    { margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: "#f1f5f9" },
  configSubtitulo: { margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#94a3b8" },
  configDesc:      { margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.6 },
  configVarList:   { display: "flex", flexDirection: "column", gap: 10, marginBottom: 4 },
  configVar:       { background: "rgba(2,6,23,0.5)", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 },
  configVarChave:  { fontSize: 12, fontFamily: "monospace", color: "#93c5fd", fontWeight: 700 },
  configVarLabel:  { fontSize: 11, color: "#475569" },
  configVarDesc:   { fontSize: 11, color: "#64748b", lineHeight: 1.5 },
  configSeparator: { height: 1, background: "rgba(148,163,184,0.1)", margin: "20px 0" },
  linkConfig:      { fontSize: 13, color: "#93c5fd", fontWeight: 700, textDecoration: "none" },

  empty: { color: "#475569", textAlign: "center" as const, padding: "40px 0" },
};
