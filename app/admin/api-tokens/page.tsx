"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";

type ApiToken = {
  id: string;
  nome: string;
  token: string;
  descricao: string | null;
  ativo: boolean;
  ultimo_uso_em: string | null;
  usos: number;
  criado_por: string | null;
  created_at: string;
};

const VAZIO = { nome: "", descricao: "", criado_por: "" };

export default function ApiTokensPage() {
  const [lista, setLista] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [tabelaExiste, setTabelaExiste] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_tokens")
      .select("*")
      .order("created_at", { ascending: false });
    if (error && error.code === "42P01") {
      setTabelaExiste(false);
    } else {
      setLista((data ?? []) as ApiToken[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function copiar(token: string) {
    void navigator.clipboard.writeText(token).then(() => {
      setCopiado(token);
      setTimeout(() => setCopiado(null), 2500);
    });
  }

  async function salvar() {
    if (!form.nome.trim()) { setMsg("Nome é obrigatório."); return; }
    setSalvando(true);
    setMsg("Criando...");
    const { error } = await supabase.from("api_tokens").insert({
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
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
    await supabase.from("api_tokens").update({ ativo: !atual }).eq("id", id);
    void carregar();
  }

  async function excluir(id: string, nome: string) {
    const ok = await confirmAction(`Revogar e excluir o token "${nome}"? Sistemas que usam este token perderão acesso imediatamente.`);
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm(`Revogar e excluir o token "${nome}"?`)) return;
      else if (isConfirmModalReady()) return;
    }
    const { error } = await supabase.from("api_tokens").delete().eq("id", id);
    if (error) { triggerToast(`Erro ao excluir: ${error.message}`, "error"); return; }
    triggerToast(`Token "${nome}" revogado.`, "success");
    void carregar();
  }

  if (!tabelaExiste) {
    return (
      <div style={s.wrap}>
        <h1 style={s.titulo}>Tokens de API</h1>
        <div style={s.aviso}>
          <p style={s.avisoTitulo}>Migração pendente</p>
          <p style={s.avisoTexto}>
            A tabela <code>api_tokens</code> ainda não existe no banco de dados.
            Execute a migration para habilitar este módulo.
          </p>
          <pre style={s.pre}>{SQL_MIGRATION}</pre>
        </div>
        <p style={{ marginTop: 16 }}>
          <Link href="/api-docs" style={s.linkDocs} target="_blank">
            Ver documentação da API →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Tokens de API</h1>
          <p style={s.sub}>
            Gere tokens para acesso programático à API pública do IPECC (endpoints autenticados futuros).
            {" "}
            <Link href="/api-docs" style={s.linkDocs} target="_blank">Ver documentação da API →</Link>
          </p>
        </div>
        <button style={s.btnPrimario} onClick={() => { setMostrarForm(true); setMsg(""); }}>
          + Novo token
        </button>
      </div>

      {mostrarForm && (
        <div style={s.formCard}>
          <h2 style={s.formTitulo}>Novo token de API</h2>
          <div style={s.formGrid}>
            <label style={s.label}>
              Nome / sistema de destino *
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Painel externo da prefeitura" style={s.input} />
            </label>
            <label style={s.label}>
              Criado por
              <input value={form.criado_por} onChange={(e) => setForm((f) => ({ ...f, criado_por: e.target.value }))}
                placeholder="Seu e-mail ou nome" style={s.input} />
            </label>
          </div>
          <label style={s.label}>
            Descrição / uso previsto
            <textarea rows={2} value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: Integração com painel de monitoramento do convênio 001/2026"
              style={s.textarea} />
          </label>
          <div style={s.formAcoes}>
            <button style={s.btnPrimario} onClick={salvar} disabled={salvando}>
              {salvando ? "Gerando..." : "Gerar token"}
            </button>
            <button style={s.btnGhost} onClick={() => { setMostrarForm(false); setMsg(""); }}>Cancelar</button>
            {msg && <span style={s.msgFeedback}>{msg}</span>}
          </div>
        </div>
      )}

      {!mostrarForm && msg && <p style={{ ...s.msgFeedback, marginBottom: 12 }}>{msg}</p>}

      {loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : lista.length === 0 ? (
        <div style={s.emptyBox}>
          <p style={s.emptyTitulo}>Nenhum token criado ainda</p>
          <p style={s.emptySub}>
            Os endpoints públicos (<code>/api/v1/editais</code>, <code>/api/v1/indicadores</code>, etc.)
            não requerem token. Tokens serão necessários para endpoints autenticados futuros.
          </p>
          <Link href="/api-docs" style={s.btnPrimario} target="_blank">
            Ver documentação da API
          </Link>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Nome / sistema", "Token", "Usos", "Status", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((t, i) => (
                <tr key={t.id} style={i % 2 ? s.trAlt : s.tr}>
                  <td style={s.td}>
                    <strong style={{ color: "#e2e8f0" }}>{t.nome}</strong>
                    {t.descricao && <div style={s.obs}>{t.descricao}</div>}
                    {t.criado_por && <div style={s.obs}>por {t.criado_por}</div>}
                  </td>
                  <td style={s.td}>
                    <div style={s.tokenCode}>{t.token.slice(0, 16)}…</div>
                    <button
                      style={{ ...s.btnCopiar, ...(copiado === t.token ? s.btnCopiado : {}) }}
                      onClick={() => copiar(t.token)}
                    >
                      {copiado === t.token ? "Copiado!" : "Copiar"}
                    </button>
                  </td>
                  <td style={s.td}>
                    <strong style={{ color: "#7dd3fc" }}>{t.usos}</strong>
                    {t.ultimo_uso_em && (
                      <div style={s.obs}>{new Date(t.ultimo_uso_em).toLocaleDateString("pt-BR")}</div>
                    )}
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
                    <button style={s.btnDel} onClick={() => excluir(t.id, t.nome)}>Excluir</button>
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

const SQL_MIGRATION = `CREATE TABLE public.api_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  token        text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  descricao    text,
  ativo        boolean NOT NULL DEFAULT true,
  usos         integer NOT NULL DEFAULT 0,
  ultimo_uso_em timestamptz,
  criado_por   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_api_tokens" ON public.api_tokens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);`;

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 0", color: "#94a3b8", fontSize: 13, maxWidth: 600 },
  linkDocs: { color: "#38bdf8", textDecoration: "none", fontSize: 13, fontWeight: 600 },
  formCard: { background: "rgba(15,23,42,0.92)", border: "1px solid rgba(148,163,184,0.28)", borderRadius: 18, padding: 22, marginBottom: 20 },
  formTitulo: { margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#e0f2fe" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 },
  formAcoes: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 },
  label: { fontSize: 13, fontWeight: 600, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 },
  input: { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },
  textarea: { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13, resize: "vertical" as const },
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
  badge: { display: "inline-flex", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800 },
  badgeAtivo: { background: "rgba(22,101,52,0.28)", color: "#86efac", border: "1px solid #166534" },
  badgeInativo: { background: "rgba(100,116,139,0.2)", color: "#64748b", border: "1px solid #334155" },
  btnPrimario: { padding: "9px 18px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "none", display: "inline-block" },
  btnGhost: { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnCopiar: { padding: "4px 10px", borderRadius: 7, border: "1px solid #1e40af", background: "rgba(30,64,175,0.18)", color: "#93c5fd", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  btnCopiado: { background: "rgba(22,101,52,0.28)", borderColor: "#166534", color: "#86efac" },
  btnToggle: { marginRight: 6, padding: "5px 10px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnDel: { padding: "5px 10px", borderRadius: 7, border: "1px solid #7f1d1d", background: "rgba(127,29,29,0.18)", color: "#fca5a5", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  empty: { color: "#64748b", marginTop: 24, textAlign: "center" },
  emptyBox: { background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 16, padding: 32, textAlign: "center" as const },
  emptyTitulo: { fontSize: 16, fontWeight: 800, color: "#94a3b8", margin: "0 0 8px" },
  emptySub: { fontSize: 13, color: "#475569", margin: "0 0 20px", lineHeight: 1.6 },
  aviso: { background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 14, padding: "20px 22px", marginTop: 16 },
  avisoTitulo: { margin: "0 0 8px", fontWeight: 800, color: "#fde047" },
  avisoTexto: { margin: "0 0 14px", fontSize: 13, color: "#94a3b8" },
  pre: { margin: 0, padding: "12px 16px", background: "rgba(2,6,23,0.8)", borderRadius: 8, fontSize: 12, color: "#a5f3fc", fontFamily: "monospace", overflowX: "auto" as const },
};
