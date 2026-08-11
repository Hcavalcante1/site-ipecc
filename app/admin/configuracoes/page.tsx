"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Integracao, StatusIntegracao } from "@/app/api/admin/configuracoes/route";

type Resumo = { total: number; ok: number; parcial: number; nao_configurado: number };

const STATUS_ESTILO: Record<StatusIntegracao, { label: string; cor: string; bg: string; borda: string; icon: string }> = {
  ok:              { label: "Configurado",     cor: "#86efac", bg: "rgba(22,101,52,0.18)",   borda: "#166534", icon: "✓" },
  parcial:         { label: "Parcial",         cor: "#fde047", bg: "rgba(161,98,7,0.18)",    borda: "#a16207", icon: "⚠" },
  nao_configurado: { label: "Não configurado", cor: "#fca5a5", bg: "rgba(127,29,29,0.18)",   borda: "#7f1d1d", icon: "✗" },
};

export default function ConfiguracoesPage() {
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [resumo, setResumo]           = useState<Resumo | null>(null);
  const [loading, setLoading]         = useState(true);

  // Teste de e-mail
  const [emailTeste, setEmailTeste]       = useState("");
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{ ok: boolean; msg: string } | null>(null);
  const [userEmail, setUserEmail]         = useState("");

  // Organização
  const [orgNome, setOrgNome]   = useState("");
  const [orgPlano, setOrgPlano] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/configuracoes");
      const json = await res.json() as { integracoes: Integracao[]; resumo: Resumo };
      setIntegracoes(json.integracoes ?? []);
      setResumo(json.resumo ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) { setUserEmail(user.email); setEmailTeste(user.email); }
    })();

    void (async () => {
      // Organizacao do usuario logado, nao a mais antiga do banco (bug
      // real corrigido em 2026-08-11 -- ver
      // docs/RELATORIO-COMPLETO-GAPS-OPERACIONAIS-2026-08-11.md).
      const IPECC_ORG_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const { data: { user } } = await supabase.auth.getUser();
      let d: { nome?: string; plano?: string } | null = null;
      if (user) {
        const { data: membro } = await supabase
          .from("org_membros")
          .select("organizacoes(nome, plano)")
          .eq("user_id", user.id)
          .eq("ativo", true)
          .limit(1)
          .maybeSingle();
        d = membro?.organizacoes
          ? ((Array.isArray(membro.organizacoes) ? membro.organizacoes[0] : membro.organizacoes) as typeof d)
          : null;
      }
      if (!d) {
        const { data: orgPadrao } = await supabase
          .from("organizacoes")
          .select("nome, plano")
          .eq("id", IPECC_ORG_ID)
          .maybeSingle();
        d = orgPadrao as typeof d;
      }
      if (d) { setOrgNome(d.nome ?? ""); setOrgPlano(d.plano ?? ""); }
    })();
  }, [carregar]);

  async function testarEmail() {
    if (!emailTeste.trim()) return;
    setEnviandoTeste(true);
    setResultadoTeste(null);

    const res  = await fetch("/api/admin/configuracoes/testar-email", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ destinatario: emailTeste }),
    });
    const json = await res.json() as { ok: boolean; from?: string; error?: string; detalhe?: string };

    setEnviandoTeste(false);
    if (json.ok) {
      setResultadoTeste({ ok: true, msg: `E-mail enviado para ${emailTeste} via ${json.from ?? "—"}` });
    } else {
      const msg = json.detalhe ?? json.error ?? "Falha desconhecida";
      setResultadoTeste({ ok: false, msg });
    }
  }

  const pontuacao = resumo
    ? Math.round(((resumo.ok * 2 + resumo.parcial) / (resumo.total * 2)) * 100)
    : 0;

  return (
    <div style={s.wrap}>
      {/* Cabeçalho */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Configurações e Integrações</h1>
          <p style={s.sub}>Status de todos os serviços configurados na plataforma.</p>
        </div>
        <button style={s.btnRefresh} onClick={() => void carregar()} disabled={loading}>
          {loading ? "⟳ Atualizando..." : "⟳ Atualizar"}
        </button>
      </div>

      {/* Org info + pontuação */}
      {(orgNome || resumo) && (
        <div style={s.orgCard}>
          <div style={s.orgInfo}>
            <div style={s.orgNome}>{orgNome || "Organização"}</div>
            <div style={s.orgPlano}>
              Plano:{" "}
              <span style={{ color: planoCorMap[orgPlano] ?? "#94a3b8", fontWeight: 800 }}>
                {orgPlano || "—"}
              </span>
            </div>
          </div>
          {resumo && (
            <div style={s.pontuacaoWrap}>
              <div style={s.pontuacaoLabel}>Integrações configuradas</div>
              <div style={s.barOuter}>
                <div style={{
                  ...s.barInner,
                  width: `${pontuacao}%`,
                  background: pontuacao >= 80 ? "#22c55e" : pontuacao >= 50 ? "#eab308" : "#ef4444",
                }} />
              </div>
              <div style={s.pontuacaoNum}>{pontuacao}%</div>
              <div style={s.pontuacaoDetalhe}>
                {resumo.ok} ok · {resumo.parcial} parcial · {resumo.nao_configurado} ausente
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid de integrações */}
      {loading ? (
        <p style={s.empty}>Verificando integrações...</p>
      ) : (
        <div style={s.grid}>
          {integracoes.map((integ) => {
            const st = STATUS_ESTILO[integ.status];
            return (
              <div key={integ.id} style={{ ...s.card, borderColor: `${st.borda}55` }}>
                <div style={s.cardTop}>
                  <div style={s.cardIcone}>{integ.icone}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.cardNome}>{integ.nome}</div>
                    <span style={{ ...s.statusChip, color: st.cor, background: st.bg, border: `1px solid ${st.borda}66` }}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  {integ.doc_url && (
                    <a href={integ.doc_url} target="_blank" rel="noopener noreferrer" style={s.docLink}>
                      ↗ Painel
                    </a>
                  )}
                </div>

                <p style={s.cardDesc}>{integ.descricao}</p>

                <div style={s.camposList}>
                  {integ.campos.map((c) => (
                    <div key={c.chave} style={s.campoRow}>
                      <span style={{ color: c.presente ? "#86efac" : "#fca5a5", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {c.presente ? "✓" : "✗"}
                      </span>
                      <span style={s.campoLabel}>{c.label}</span>
                      <code style={{ ...s.campoChave, color: c.presente ? "#64748b" : "#ef4444" }}>
                        {c.chave}
                      </code>
                    </div>
                  ))}
                </div>

                {integ.status !== "ok" && (
                  <div style={s.dicaBox}>
                    <span style={s.dicaLabel}>Como configurar:</span>{" "}
                    Adicione as variáveis de ambiente ausentes no painel da Vercel (ou .env.local em dev) e faça redeploy.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Teste de e-mail */}
      <div style={s.testeCard}>
        <h2 style={s.testeTitulo}>📧 Testar envio de e-mail</h2>
        <p style={s.testeDesc}>
          Envia uma mensagem de teste para verificar se o envio de e-mail está funcionando.
          {userEmail && <> Seu e-mail: <strong>{userEmail}</strong></>}
        </p>
        <div style={s.testeRow}>
          <input
            type="email"
            placeholder="destinatario@email.com"
            value={emailTeste}
            onChange={(e) => setEmailTeste(e.target.value)}
            style={s.inputTeste}
          />
          <button
            style={s.btnTestar}
            onClick={() => void testarEmail()}
            disabled={enviandoTeste || !emailTeste.trim()}
          >
            {enviandoTeste ? "Enviando..." : "Enviar teste"}
          </button>
        </div>
        {resultadoTeste && (
          <div style={{
            ...s.resultadoTeste,
            borderColor: resultadoTeste.ok ? "#166534" : "#7f1d1d",
            background:  resultadoTeste.ok ? "rgba(22,101,52,0.12)" : "rgba(127,29,29,0.12)",
            color:       resultadoTeste.ok ? "#86efac" : "#fca5a5",
          }}>
            {resultadoTeste.ok ? "✓ " : "✗ "}{resultadoTeste.msg}
          </div>
        )}
      </div>

      {/* Links rápidos */}
      <div style={s.linksRapidos}>
        <h3 style={s.linksTitle}>Configurações relacionadas</h3>
        <div style={s.linksGrid}>
          {[
            { href: "/admin/organizacao",  label: "Minha Organização", desc: "Nome, CNPJ, logo, tema de cores" },
            { href: "/admin/faturamento",  label: "Faturamento",       desc: "Plano, assinatura, portal Stripe" },
            { href: "/admin/acessos",      label: "Acessos",           desc: "Membros, papéis e convites" },
            { href: "/admin/diagnostico",  label: "Diagnóstico",       desc: "Verificação completa da plataforma" },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={s.linkCard}>
              <div style={s.linkLabel}>{l.label} →</div>
              <div style={s.linkDesc}>{l.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const planoCorMap: Record<string, string> = {
  gratuito:     "#94a3b8",
  starter:      "#93c5fd",
  profissional: "#c4b5fd",
  enterprise:   "#86efac",
};

const s: Record<string, React.CSSProperties> = {
  wrap:           { padding: 24, color: "#e5e7eb", maxWidth: 1000 },
  pageHeader:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  titulo:         { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub:            { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  btnRefresh:     { padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  orgCard:        { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "18px 22px", marginBottom: 22, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" },
  orgInfo:        { flex: 1, minWidth: 180 },
  orgNome:        { fontSize: 17, fontWeight: 900, color: "#f1f5f9", marginBottom: 4 },
  orgPlano:       { fontSize: 13, color: "#64748b" },
  pontuacaoWrap:  { display: "flex", flexDirection: "column", gap: 4, minWidth: 200 },
  pontuacaoLabel: { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  barOuter:       { height: 8, borderRadius: 999, background: "rgba(148,163,184,0.15)", overflow: "hidden" },
  barInner:       { height: "100%", borderRadius: 999, transition: "width 0.5s ease" },
  pontuacaoNum:   { fontSize: 22, fontWeight: 900, color: "#f1f5f9", lineHeight: 1 },
  pontuacaoDetalhe: { fontSize: 11, color: "#475569" },
  grid:           { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 24 },
  card:           { background: "rgba(15,23,42,0.85)", border: "1px solid", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 },
  cardTop:        { display: "flex", gap: 12, alignItems: "flex-start" },
  cardIcone:      { fontSize: 24, flexShrink: 0 },
  cardNome:       { fontSize: 14, fontWeight: 800, color: "#f1f5f9", marginBottom: 5 },
  statusChip:     { fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, display: "inline-flex", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  docLink:        { fontSize: 11, color: "#64748b", textDecoration: "none", fontWeight: 600, flexShrink: 0, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(148,163,184,0.2)" },
  cardDesc:       { fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: 0 },
  camposList:     { display: "flex", flexDirection: "column", gap: 6 },
  campoRow:       { display: "flex", gap: 8, alignItems: "baseline" },
  campoLabel:     { fontSize: 11, color: "#94a3b8", flex: "0 0 auto" },
  campoChave:     { fontSize: 10, fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  dicaBox:        { fontSize: 11, color: "#475569", background: "rgba(2,6,23,0.5)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.6 },
  dicaLabel:      { fontWeight: 700, color: "#334155" },
  testeCard:      { background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: "20px 24px", marginBottom: 24 },
  testeTitulo:    { margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: "#f1f5f9" },
  testeDesc:      { margin: "0 0 14px", fontSize: 13, color: "#64748b", lineHeight: 1.5 },
  testeRow:       { display: "flex", gap: 10, flexWrap: "wrap" },
  inputTeste:     { flex: "1 1 260px", padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.3)", background: "rgba(2,6,23,0.7)", color: "#e2e8f0", fontSize: 13 },
  btnTestar:      { padding: "9px 20px", borderRadius: 9, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  resultadoTeste: { marginTop: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid", fontSize: 13, fontWeight: 600 },
  linksRapidos:   { marginTop: 4 },
  linksTitle:     { fontSize: 13, fontWeight: 800, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12 },
  linksGrid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 },
  linkCard:       { background: "rgba(15,23,42,0.7)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 12, padding: "14px 16px", textDecoration: "none", display: "block", transition: "border-color 0.15s" },
  linkLabel:      { fontSize: 13, fontWeight: 700, color: "#93c5fd", marginBottom: 4 },
  linkDesc:       { fontSize: 11, color: "#475569", lineHeight: 1.4 },
  empty:          { color: "#475569", textAlign: "center" as const, padding: "40px 0" },
};
