"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Tipo = "propostas" | "beneficiarios" | "editais" | "lgpd" | "resumo";
type Formato = "csv" | "pdf";

type Contagens = {
  propostas: number;
  beneficiarios: number;
  editais: number;
  lgpd: number;
};

const RELATORIOS: { id: Tipo; titulo: string; descricao: string; icone: string; cor: string; suportaCsv: boolean }[] = [
  { id: "resumo",        titulo: "Relatório institucional", descricao: "Visão geral consolidada: editais, propostas, beneficiários e LGPD.", icone: "📊", cor: "#93c5fd", suportaCsv: false },
  { id: "propostas",     titulo: "Propostas",               descricao: "Todas as propostas recebidas no período com dados do proponente.", icone: "📥", cor: "#a78bfa", suportaCsv: true },
  { id: "beneficiarios", titulo: "Beneficiários",           descricao: "Cadastro de beneficiários ativos e inativados no período.",       icone: "👥", cor: "#86efac", suportaCsv: true },
  { id: "editais",       titulo: "Editais",                 descricao: "Editais e chamamentos públicos com status e fases.",              icone: "📋", cor: "#fde047", suportaCsv: true },
  { id: "lgpd",          titulo: "LGPD / Privacidade",      descricao: "Solicitações de titulares recebidas e seus status de resposta.",  icone: "🔒", cor: "#fb923c", suportaCsv: true },
];

export default function RelatoriosPage() {
  const [inicio, setInicio]       = useState("");
  const [fim, setFim]             = useState("");
  const [contagens, setContagens] = useState<Contagens | null>(null);
  const [baixando, setBaixando]   = useState<string | null>(null);

  const hoje = new Date().toISOString().slice(0, 10);
  const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);

  useEffect(() => {
    setInicio(primeiroDiaMes);
    setFim(hoje);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarContagens = useCallback(async () => {
    const [p, b, e, l] = await Promise.all([
      supabase.from("propostas").select("id", { count: "exact", head: true }),
      supabase.from("beneficiarios").select("id", { count: "exact", head: true }),
      supabase.from("editais").select("id", { count: "exact", head: true }),
      supabase.from("lgpd_solicitacoes").select("id", { count: "exact", head: true }),
    ]);
    setContagens({
      propostas:     p.count ?? 0,
      beneficiarios: b.count ?? 0,
      editais:       e.count ?? 0,
      lgpd:          l.count ?? 0,
    });
  }, []);

  useEffect(() => { void carregarContagens(); }, [carregarContagens]);

  async function baixar(tipo: Tipo, formato: Formato) {
    const chave = `${tipo}-${formato}`;
    setBaixando(chave);

    const params = new URLSearchParams({ tipo, formato });
    if (inicio) params.set("inicio", inicio);
    if (fim)    params.set("fim", fim);

    try {
      const res = await fetch(`/api/admin/relatorios?${params.toString()}`);
      if (!res.ok) throw new Error("Falha na geração");

      const blob = await res.blob();
      const ext  = formato === "pdf" ? "pdf" : "csv";
      const nome = `${tipo}-${new Date().toISOString().slice(0, 10)}.${ext}`;

      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setBaixando(null);
    }
  }

  const contagemPorTipo: Record<Tipo, number> = {
    propostas:     contagens?.propostas     ?? 0,
    beneficiarios: contagens?.beneficiarios ?? 0,
    editais:       contagens?.editais       ?? 0,
    lgpd:          contagens?.lgpd          ?? 0,
    resumo:        Object.values(contagens ?? {}).reduce((a, b) => a + b, 0),
  };

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Relatórios</h1>
          <p style={s.sub}>Exporte dados da plataforma em CSV (Excel) ou PDF formatado.</p>
        </div>
      </div>

      {/* Filtro de período */}
      <div style={s.filtroCard}>
        <h2 style={s.filtroTitulo}>Período do relatório</h2>
        <div style={s.filtroRow}>
          <label style={s.label}>
            Data inicial
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              style={s.input}
              max={hoje}
            />
          </label>
          <label style={s.label}>
            Data final
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              style={s.input}
              max={hoje}
            />
          </label>
          <div style={s.atalhosBtns}>
            <span style={s.atalhoLabel}>Atalhos:</span>
            {[
              { label: "Este mês",        i: primeiroDiaMes,                                                              f: hoje },
              { label: "Últ. 30 dias",    i: new Date(Date.now() - 30*86400000).toISOString().slice(0,10),                f: hoje },
              { label: "Este ano",        i: `${new Date().getFullYear()}-01-01`,                                         f: hoje },
              { label: "Tudo",            i: "",                                                                           f: "" },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                style={s.atalhoBtn}
                onClick={() => { setInicio(a.i); setFim(a.f); }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de relatório */}
      <div style={s.grid}>
        {RELATORIOS.map((rel) => {
          const count = contagemPorTipo[rel.id];
          const carregandoCsv = baixando === `${rel.id}-csv`;
          const carregandoPdf = baixando === `${rel.id}-pdf`;
          const qualquerCarregando = !!baixando;

          return (
            <div key={rel.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={{ ...s.iconeWrap, background: `${rel.cor}18`, border: `1px solid ${rel.cor}44` }}>
                  <span style={{ fontSize: 22 }}>{rel.icone}</span>
                </div>
                <div style={s.countBadge}>
                  <span style={{ ...s.countNum, color: rel.cor }}>{count}</span>
                  <span style={s.countLabel}>registros</span>
                </div>
              </div>

              <h3 style={s.cardTitulo}>{rel.titulo}</h3>
              <p style={s.cardDesc}>{rel.descricao}</p>

              <div style={s.btnRow}>
                <button
                  style={{
                    ...s.btnBaixar,
                    background: `${rel.cor}18`,
                    border: `1px solid ${rel.cor}44`,
                    color: rel.cor,
                    opacity: carregandoPdf || qualquerCarregando ? 0.6 : 1,
                  }}
                  onClick={() => void baixar(rel.id, "pdf")}
                  disabled={qualquerCarregando}
                  title="Baixar como PDF formatado"
                >
                  {carregandoPdf ? "Gerando..." : "⬇ PDF"}
                </button>
                {rel.suportaCsv && (
                  <button
                    style={{
                      ...s.btnBaixar,
                      background: "rgba(148,163,184,0.08)",
                      border: "1px solid rgba(148,163,184,0.2)",
                      color: "#94a3b8",
                      opacity: carregandoCsv || qualquerCarregando ? 0.6 : 1,
                    }}
                    onClick={() => void baixar(rel.id, "csv")}
                    disabled={qualquerCarregando}
                    title="Baixar como CSV (compatível com Excel)"
                  >
                    {carregandoCsv ? "Gerando..." : "⬇ CSV"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p style={s.nota}>
        CSV inclui todos os campos e é compatível com Excel e LibreOffice.
        PDF gera um documento formatado com tabelas prontas para impressão.
        Registros limitados a 500 por exportação — use filtros de data para recortes maiores.
      </p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap:         { padding: 24, color: "#e5e7eb", maxWidth: 1000 },
  pageHeader:   { marginBottom: 24 },
  titulo:       { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:          { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  filtroCard:   { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "20px 24px", marginBottom: 24 },
  filtroTitulo: { margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  filtroRow:    { display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" },
  label:        { fontSize: 12, fontWeight: 600, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 },
  input:        { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.35)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  atalhosBtns:  { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingBottom: 2 },
  atalhoLabel:  { fontSize: 11, color: "#334155", fontWeight: 600 },
  atalhoBtn:    { padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(148,163,184,0.2)", background: "transparent", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 20 },
  card:         { background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 },
  cardTop:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  iconeWrap:    { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" },
  countBadge:   { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  countNum:     { fontSize: 26, fontWeight: 900, lineHeight: 1 },
  countLabel:   { fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  cardTitulo:   { margin: 0, fontSize: 15, fontWeight: 800, color: "#f1f5f9" },
  cardDesc:     { margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5, flex: 1 },
  btnRow:       { display: "flex", gap: 8, marginTop: 4 },
  btnBaixar:    { flex: 1, padding: "9px 0", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer", textAlign: "center" as const },
  nota:         { fontSize: 12, color: "#334155", lineHeight: 1.6 },
};
