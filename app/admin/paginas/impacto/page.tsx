"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
} from "@/lib/supabaseClient";

export default function ImpactoPage() {
  const [titulo, setTitulo] = useState("Impacto Social");
  const [texto, setTexto] = useState(
    "A APECC promove inclusão, cidadania e transformação social por meio de projetos culturais, educacionais e comunitários que fortalecem o vínculo entre sociedade civil e poder público."
  );
  const [imagem, setImagem] = useState("/media/home/impacto/impacto-social.jpg");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 CORREÇÃO: carregar do banco
  useEffect(() => {
    async function carregar() {
      const data = await fetchPaginaConteudo(supabase, "home", "impacto");

      if (data) {
        setTitulo(data.titulo || "Impacto Social");
        setTexto(data.texto || "");
        setImagem(data.imagem_url || "/media/home/impacto/impacto-social.jpg");
      }

      setLoading(false);
    }

    carregar();
  }, []);

  async function salvar() {
    setMensagem("Salvando...");
    setSalvando(true);

    try {
      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: "home",
        bloco: "impacto",
        titulo,
        texto,
        imagem_url: imagem,
      });

      if (error) {
        console.error("Erro ao salvar Impacto Social:", error);
        setMensagem(`Erro ao salvar: ${error.message}`);
        return;
      }

      setMensagem("Salvo com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <div className="admin-box">Carregando...</div>;
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Impacto Social</h1>
        <p className="admin-subtitle">
          Edite o título, o parágrafo e a imagem do bloco de Impacto Social.
        </p>
      </div>

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <h2 style={{ marginTop: 0 }}>Conteúdo</h2>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
          Título:
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
          Texto:
          <textarea
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            style={textareaStyle}
          />
        </label>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
          Caminho da imagem:
          <input
            type="text"
            value={imagem}
            onChange={(e) => setImagem(e.target.value)}
            style={inputStyle}
          />
        </label>

        <AdminSalvarButton salvando={salvando} onClick={salvar} />

        {mensagem && (
          <p style={{ marginTop: 10, fontSize: ".85rem", color: "#bbf7d0" }}>
            {mensagem}
          </p>
        )}
      </form>
    </>
  );
}

const inputStyle = {
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,.8)",
  background: "rgba(15,23,42,.85)",
  color: "#e5e7eb",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
};
