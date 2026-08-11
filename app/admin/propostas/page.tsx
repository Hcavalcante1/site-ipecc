"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { triggerToast } from "@/components/AdminToast";
import { formatarCategoria, formatarTipoPessoa } from "@/lib/documental";
import { useResumoAnexosListagem } from "@/components/admin/propostas/useResumoAnexosListagem";
import {
  getRotuloVinculoProposta,
  getUrlConsultaEditalAdmin,
  propostaTemVinculoOficial,
} from "@/lib/editais/governancaRules";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusProposta = "pendente" | "aprovado" | "rejeitado" | "em_analise";

type Proposta = {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  mensagem: string;
  tipo?: string;
  status?: string;
  categoria?: string | null;
  criado_em?: string | null;
  edital_id?: string | null;
  editais?:
    | { titulo?: string | null; fase_atual?: string | null; tipo?: string | null; processo_id?: string | null }
    | { titulo?: string | null; fase_atual?: string | null; tipo?: string | null; processo_id?: string | null }[]
    | null;
  [key: string]: unknown;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_ESTILO: Record<string, { label: string; cor: string; bg: string; borda: string }> = {
  pendente:   { label: "Pendente",    cor: "#fde047", bg: "rgba(161,98,7,0.15)",  borda: "#a16207" },
  em_analise: { label: "Em análise",  cor: "#93c5fd", bg: "rgba(29,78,216,0.15)", borda: "#1d4ed8" },
  aprovado:   { label: "Aprovado",    cor: "#86efac", bg: "rgba(22,101,52,0.15)", borda: "#166534" },
  rejeitado:  { label: "Rejeitado",   cor: "#fca5a5", bg: "rgba(127,29,29,0.15)", borda: "#7f1d1d" },
};

function statusEstilo(status?: string) {
  return STATUS_ESTILO[status ?? "pendente"] ?? STATUS_ESTILO.pendente;
}

function dataRelativa(iso?: string | null): string {
  if (!iso) return "—";
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const dias = Math.floor(diff / 86400000);
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30)  return `${dias}d atrás`;
  return d.toLocaleDateString("pt-BR");
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PropostasPage() {
  const escopo = useAdminEscopoCliente();

  const [todas, setTodas]       = useState<Proposta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [atualizando, setAtual] = useState<string | null>(null);

  // Confirmação inline (substitui alert/confirm)
  const [confirmacao, setConfirmacao] = useState<{ id: string; acao: "aprovado" | "rejeitado" } | null>(null);

  // Filtros
  const [busca, setBusca]               = useState("");
  const buscaReal                       = useRef("");
  const buscaTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusProposta | "">("");
  const [pagina, setPagina]             = useState(0);

  const { resumo: resumoAnexos, carregando: carregandoAnexos } =
    useResumoAnexosListagem(todas);

  // ── Loader ──────────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    if (escopo.loading) return;
    setLoading(true);

    const { data } = await supabase
      .from("propostas")
      .select("*, editais(titulo, fase_atual, tipo, processo_id)")
      .order("criado_em", { ascending: false });

    const lista = ((data ?? []) as Proposta[]).filter((p) => {
      const edital = Array.isArray(p.editais) ? p.editais[0] : p.editais;
      return registroNoEscopoProcesso(edital?.processo_id, escopo.processoIds);
    });

    setTodas(lista);
    setLoading(false);
  }, [escopo.loading, escopo.processoIds]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // ── Filtro client-side ──────────────────────────────────────────────────

  const exibidas = todas.filter((p) => {
    if (filtroStatus && (p.status ?? "pendente") !== filtroStatus) return false;
    const q = buscaReal.current.toLowerCase();
    if (!q) return true;
    return (
      p.nome?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.cnpj?.toLowerCase().includes(q) ||
      p.telefone?.toLowerCase().includes(q)
    );
  });

  // ── Stats ───────────────────────────────────────────────────────────────

  const total      = todas.length;
  const pendentes  = todas.filter((p) => !p.status || p.status === "pendente" || p.status === "em_analise").length;
  const aprovadas  = todas.filter((p) => p.status === "aprovado").length;
  const rejeitadas = todas.filter((p) => p.status === "rejeitado").length;

  // ── Paginação client-side ───────────────────────────────────────────────

  const POR_PAGINA = 12;
  const exibidasPaginadas = exibidas.slice(0, (pagina + 1) * POR_PAGINA);
  const temMais = exibidas.length > exibidasPaginadas.length;

  // ── Busca debounced ─────────────────────────────────────────────────────

  function onBuscaChange(v: string) {
    setBusca(v);
    setPagina(0);
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(() => { buscaReal.current = v; setBusca(v); }, 300);
  }

  // ── Atualizar status ────────────────────────────────────────────────────

  async function confirmarAcao() {
    if (!confirmacao) return;
    const { id, acao } = confirmacao;
    setConfirmacao(null);
    setAtual(id);

    const { error } = await supabase.from("propostas").update({ status: acao }).eq("id", id);
    if (error) {
      triggerToast(`Erro ao ${acao === "aprovado" ? "aprovar" : "rejeitar"} proposta: ${error.message}`, "error");
      setAtual(null);
      return;
    }

    if (acao === "aprovado") {
      const ponte = await fetch("/api/admin/transparencia/ponte", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "convenio_de_proposta", propostaId: id }),
      }).then((r) => r.json()).catch(() => null) as { ok?: boolean; message?: string; error?: string } | null;

      if (ponte?.ok) {
        triggerToast(ponte.message ?? "Rascunho de convênio criado na Transparência.", "success");
      } else if (ponte?.error) {
        triggerToast(`Proposta aprovada, mas ponte falhou: ${ponte.error}`, "error");
      } else {
        triggerToast("Proposta aprovada.", "success");
      }
    } else {
      triggerToast("Proposta rejeitada.", "success");
    }

    setAtual(null);
    void carregar();
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (escopo.loading || loading) {
    return <p style={s.empty}>Carregando propostas…</p>;
  }

  return (
    <div style={s.wrap}>
      {/* Confirmação inline */}
      {confirmacao && (
        <div style={s.confirmOverlay}>
          <div style={s.confirmBox}>
            <p style={s.confirmMsg}>
              {confirmacao.acao === "aprovado"
                ? "Confirmar aprovação desta proposta? Um rascunho de convênio será criado na Transparência."
                : "Confirmar rejeição desta proposta?"}
            </p>
            <div style={s.confirmBtns}>
              <button
                style={{ ...s.btnConfirm, background: confirmacao.acao === "aprovado" ? "#166534" : "#7f1d1d" }}
                onClick={() => void confirmarAcao()}
              >
                {confirmacao.acao === "aprovado" ? "Aprovar" : "Rejeitar"}
              </button>
              <button style={s.btnCancelar} onClick={() => setConfirmacao(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Propostas Recebidas</h1>
          <p style={s.sub}>
            Acompanhe propostas enviadas pelo site. Aprovação cria vínculo oficial e rascunho de convênio na Transparência.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          <a href="/admin/propostas/auditoria" style={s.linkAuditoria}>Auditoria de anexos →</a>
          <button style={s.btnRefresh} onClick={() => void carregar()} disabled={loading}>
            {loading ? "⟳ Atualizando…" : "⟳ Atualizar"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label: "Total",     valor: total,      cor: "#94a3b8" },
          { label: "Pendentes", valor: pendentes,   cor: "#fde047" },
          { label: "Aprovadas", valor: aprovadas,   cor: "#86efac" },
          { label: "Rejeitadas",valor: rejeitadas,  cor: "#fca5a5" },
        ].map((st) => (
          <div key={st.label} style={s.statCard}>
            <div style={{ ...s.statNum, color: st.cor }}>{st.valor}</div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={s.filtrosWrap}>
        <input
          placeholder="Buscar nome, e-mail, CPF/CNPJ ou telefone…"
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          style={s.inputFiltro}
        />
        <select value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value as StatusProposta | ""); setPagina(0); }} style={s.selectFiltro}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em_analise">Em análise</option>
          <option value="aprovado">Aprovado</option>
          <option value="rejeitado">Rejeitado</option>
        </select>
        {(busca || filtroStatus) && (
          <button style={s.btnLimpar} onClick={() => { setBusca(""); buscaReal.current = ""; setFiltroStatus(""); setPagina(0); }}>
            ✕ Limpar
          </button>
        )}
        <span style={s.contagem}>{exibidas.length} de {total}</span>
      </div>

      {/* Lista */}
      {exibidas.length === 0 ? (
        <p style={s.empty}>
          {total === 0 ? "Nenhuma proposta recebida até o momento." : "Nenhuma proposta encontrada com os filtros aplicados."}
        </p>
      ) : (
        <div style={s.grid}>
          {exibidasPaginadas.map((p) => {
            const edital    = Array.isArray(p.editais) ? p.editais[0] : p.editais;
            const urlEdital = p.edital_id ? getUrlConsultaEditalAdmin(p.edital_id, edital) : null;
            const novaAba   = urlEdital?.startsWith("/editais/");
            const st        = statusEstilo(p.status);
            const isAtual   = atualizando === p.id;
            const statusStr = p.status ?? "pendente";
            const anexo     = resumoAnexos[p.id];

            return (
              <div key={p.id} style={{ ...s.card, borderColor: `${st.borda}44` }}>
                {/* Topo */}
                <div style={s.cardTop}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.cardNome}>{p.nome}</div>
                    <div style={s.cardSub}>
                      {p.email && <span>{p.email}</span>}
                      {p.telefone && <span>{p.telefone}</span>}
                    </div>
                  </div>
                  <span style={{ ...s.statusChip, color: st.cor, background: st.bg, border: `1px solid ${st.borda}55` }}>
                    {st.label}
                  </span>
                </div>

                {/* Detalhes */}
                <div style={s.detalhes}>
                  <Campo label="CPF/CNPJ"  valor={p.cnpj || "—"} />
                  <Campo label="Tipo"       valor={formatarTipoPessoa(p.tipo)} />
                  <Campo label="Categoria"  valor={formatarCategoria(p.categoria, p.mensagem)} />
                  <Campo label="Edital"     valor={edital?.titulo ?? "sem vínculo"} />
                  {edital?.tipo && <Campo label="Modalidade" valor={edital.tipo.trim()} />}
                  <Campo label="Recebida"   valor={dataRelativa(p.criado_em)} />
                  <Campo
                    label="Vínculo"
                    valor={getRotuloVinculoProposta(p.status)}
                    cor={propostaTemVinculoOficial(p.status) ? "#86efac" : "#64748b"}
                  />
                </div>

                {/* Anexos */}
                {carregandoAnexos ? (
                  <div style={s.anexoRow}>Verificando anexos…</div>
                ) : anexo ? (
                  <div style={{ ...s.anexoRow, color: anexo.orfaos > 0 ? "#f97316" : "#86efac" }}>
                    {anexo.orfaos > 0
                      ? `⚠ ${anexo.orfaos} anexo(s) sem arquivo (${anexo.disponiveis}/${anexo.total} disponíveis)`
                      : `✓ Todos os ${anexo.total} anexo(s) disponíveis`}
                  </div>
                ) : null}

                {/* Ações */}
                <div style={s.acoes}>
                  {p.edital_id && (
                    <Link href={`/admin/editais/${p.edital_id}/governanca`} style={s.btnGovernanca}>
                      Governança
                    </Link>
                  )}
                  {p.edital_id && urlEdital && (
                    <Link href={urlEdital} target={novaAba ? "_blank" : undefined} rel={novaAba ? "noopener noreferrer" : undefined} style={s.btnEdital}>
                      Ver edital
                    </Link>
                  )}
                  <Link href={`/admin/propostas/${p.id}`} style={s.btnVer}>
                    Ver proposta
                  </Link>

                  {statusStr !== "aprovado" && (
                    <button
                      type="button"
                      disabled={isAtual}
                      onClick={() => setConfirmacao({ id: p.id, acao: "aprovado" })}
                      style={{ ...s.btnAprovar, opacity: isAtual ? 0.6 : 1 }}
                    >
                      {isAtual ? "…" : "Aprovar"}
                    </button>
                  )}
                  {statusStr !== "rejeitado" && (
                    <button
                      type="button"
                      disabled={isAtual}
                      onClick={() => setConfirmacao({ id: p.id, acao: "rejeitado" })}
                      style={{ ...s.btnRejeitar, opacity: isAtual ? 0.6 : 1 }}
                    >
                      {isAtual ? "…" : "Rejeitar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {temMais && (
        <button type="button" style={s.btnCarregarMais} onClick={() => setPagina((p) => p + 1)}>
          Carregar mais ({exibidas.length - exibidasPaginadas.length} restantes)
        </button>
      )}
    </div>
  );
}

// ─── Campo helper ─────────────────────────────────────────────────────────────

function Campo({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: 1.5 }}>
      <span style={{ color: "#475569", flexShrink: 0, minWidth: 80 }}>{label}:</span>
      <span style={{ color: cor ?? "#94a3b8" }}>{valor}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap:         { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo:       { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:          { margin: "6px 0 0", color: "#64748b", fontSize: 13, maxWidth: 680 },
  linkAuditoria:{ fontSize: 12, color: "#93c5fd", fontWeight: 700, textDecoration: "none", padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(147,197,253,0.2)", alignSelf: "flex-start" as const },
  btnRefresh:   { padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },

  statsRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
  statCard: { flex: "1 1 140px", background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 14, padding: "14px 18px" },
  statNum:  { fontSize: 28, fontWeight: 900, lineHeight: 1, marginBottom: 4 },
  statLabel:{ fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" },

  filtrosWrap: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" },
  inputFiltro: { flex: "1 1 260px", padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  selectFiltro:{ flex: "0 0 auto", padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(2,6,23,0.9)", color: "#e2e8f0", fontSize: 13 },
  btnLimpar:   { padding: "8px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  contagem:    { fontSize: 12, color: "#334155", alignSelf: "center" as const },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 },
  btnCarregarMais: { marginTop: 16, padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "#1e293b", color: "#e2e8f0", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  card: { background: "rgba(15,23,42,0.85)", border: "1px solid", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 },

  cardTop:  { display: "flex", gap: 10, alignItems: "flex-start" },
  cardNome: { fontSize: 15, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 },
  cardSub:  { display: "flex", flexDirection: "column", gap: 2, fontSize: 12, color: "#64748b" },
  statusChip:{ fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 999, textTransform: "uppercase" as const, letterSpacing: "0.06em", flexShrink: 0, alignSelf: "flex-start" as const },

  detalhes: { display: "flex", flexDirection: "column", gap: 3 },
  anexoRow: { fontSize: 12, padding: "6px 10px", borderRadius: 8, background: "rgba(2,6,23,0.5)" },

  acoes:       { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 },
  btnGovernanca:{ padding: "6px 12px", borderRadius: 8, background: "#0f766e22", border: "1px solid #0f766e55", color: "#5eead4", fontWeight: 600, fontSize: 12, textDecoration: "none", display: "inline-flex" },
  btnEdital:   { padding: "6px 12px", borderRadius: 8, background: "#0ea5e922", border: "1px solid #0ea5e955", color: "#7dd3fc", fontWeight: 600, fontSize: 12, textDecoration: "none", display: "inline-flex" },
  btnVer:      { padding: "6px 12px", borderRadius: 8, background: "#1d4ed822", border: "1px solid #1d4ed855", color: "#93c5fd", fontWeight: 600, fontSize: 12, textDecoration: "none", display: "inline-flex" },
  btnAprovar:  { padding: "6px 12px", borderRadius: 8, border: "none", background: "#166534", color: "#86efac", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  btnRejeitar: { padding: "6px 12px", borderRadius: 8, border: "none", background: "#7f1d1d", color: "#fca5a5", fontWeight: 700, fontSize: 12, cursor: "pointer" },

  empty: { color: "#475569", textAlign: "center" as const, padding: "40px 0" },

  confirmOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  confirmBox:     { background: "#0f172a", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 16, padding: "28px 32px", maxWidth: 420, width: "90%" },
  confirmMsg:     { margin: "0 0 20px", fontSize: 15, color: "#e2e8f0", lineHeight: 1.6 },
  confirmBtns:    { display: "flex", gap: 10 },
  btnConfirm:     { padding: "10px 22px", borderRadius: 10, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  btnCancelar:    { padding: "10px 22px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.25)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer" },
};
