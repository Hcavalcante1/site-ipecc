"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
} from "@/lib/supabaseClient";
import { parsePaginaExtra } from "@/lib/cms/paginasConteudo";

const SLUG = "projetos-oficinas-educacao-cidada";
const BLOCO = "corpo";

const sInput: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,.8)",
  background: "rgba(15,23,42,.85)",
  color: "#e6edf3",
  fontSize: ".9rem",
};

const sTextarea: React.CSSProperties = {
  ...sInput,
  minHeight: 110,
  resize: "vertical",
};

export default function OficinasAdminPage() {
  const [titulo, setTitulo] = useState("");
  const [lead, setLead] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [p3, setP3] = useState("");
  const [p4, setP4] = useState("");
  const [p5, setP5] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(supabase, SLUG, BLOCO, "titulo, texto, extra");
      if (data) {
        setTitulo(data.titulo || "");
        setLead(data.texto || "");
        const ps = parsePaginaExtra<string[]>(data.extra, []);
        setP1(ps[0] || "");
        setP2(ps[1] || "");
        setP3(ps[2] || "");
        setP4(ps[3] || "");
        setP5(ps[4] || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function salvar() {
    setMsg("Salvando...");
    setSalvando(true);
    try {
      const extra = [p1, p2, p3, p4, p5].filter(Boolean);
      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: SLUG,
        bloco: BLOCO,
        titulo,
        texto: lead,
        extra,
      });
      setMsg(error ? `Erro: ${error.message}` : "Salvo com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Oficinas de Educação Cidadã</h1>
        <p className="admin-subtitle">
          Edite o conteúdo exibido na página pública /projetos/oficinas-educacao-cidada.
        </p>
      </div>

      <form className="admin-card" onSubmit={(e) => e.preventDefault()}>
        <label>Título:</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={sInput} />

        <label style={{ marginTop: 10 }}>Lead (subtítulo do hero):</label>
        <textarea value={lead} onChange={(e) => setLead(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>1º parágrafo:</label>
        <textarea value={p1} onChange={(e) => setP1(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>2º parágrafo:</label>
        <textarea value={p2} onChange={(e) => setP2(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>3º parágrafo:</label>
        <textarea value={p3} onChange={(e) => setP3(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>4º parágrafo:</label>
        <textarea value={p4} onChange={(e) => setP4(e.target.value)} style={sTextarea} />

        <label style={{ marginTop: 10 }}>5º parágrafo:</label>
        <textarea value={p5} onChange={(e) => setP5(e.target.value)} style={sTextarea} />

        <AdminSalvarButton salvando={salvando} onClick={salvar} />

        {msg && (
          <p style={{ marginTop: 10, color: "#bbf7d0", fontSize: ".8rem" }}>{msg}</p>
        )}
      </form>
    </>
  );
}
