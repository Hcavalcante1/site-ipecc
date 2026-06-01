"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
} from "@/lib/supabaseClient";

export default function ProjetosIntroducaoAdminPage() {
  const [titulo, setTitulo] = useState("");
  const [paragrafo1, setParagrafo1] = useState("");
  const [paragrafo2, setParagrafo2] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // 🔹 CARREGAR DO SUPABASE
  useEffect(() => {
    async function load() {
      const data = await fetchPaginaConteudo(
        supabase,
        "projetos",
        "introducao",
        "titulo, texto"
      );

      if (data) {
        setTitulo(data.titulo || "");

        // separa os 2 parágrafos
        const partes = (data.texto || "").split("\n\n");
        setParagrafo1(partes[0] || "");
        setParagrafo2(partes[1] || "");
      }

      setLoading(false);
    }

    load();
  }, []);

  // 🔹 SALVAR NO SUPABASE
  async function salvar() {
    setMsg("Salvando...");
    setSalvando(true);

    try {
      const textoCompleto = `${paragrafo1}\n\n${paragrafo2}`;

      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: "projetos",
        bloco: "introducao",
        titulo,
        texto: textoCompleto,
      });

      if (error) {
        setMsg(`Erro ao salvar: ${error.message}`);
        return;
      }

      setMsg("Salvo com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Introdução</h1>
        <p className="admin-subtitle">
          Edite o bloco introdutório da página "Projetos".
        </p>
      </div>

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label>Título do bloco:</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={sInput}
        />

        <label style={{ marginTop: 10 }}>1º parágrafo:</label>
        <textarea
          value={paragrafo1}
          onChange={(e) => setParagrafo1(e.target.value)}
          style={sTextarea}
        />

        <label style={{ marginTop: 10 }}>2º parágrafo:</label>
        <textarea
          value={paragrafo2}
          onChange={(e) => setParagrafo2(e.target.value)}
          style={sTextarea}
        />

        <AdminSalvarButton salvando={salvando} onClick={salvar} />

        {msg && (
          <p
            style={{
              marginTop: 10,
              color: "#bbf7d0",
              fontSize: ".8rem",
            }}
          >
            {msg}
          </p>
        )}
      </form>
    </>
  );
}