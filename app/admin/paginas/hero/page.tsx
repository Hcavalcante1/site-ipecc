"use client";

import { useEffect, useState } from "react";
import { AdminSalvarButton } from "@/components/admin";
import {
  supabase,
  fetchPaginaConteudo,
  upsertPaginaConteudo,
} from "@/lib/supabaseClient";

export default function HeroPage() {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [botaoTexto, setBotaoTexto] = useState("");
  const [botaoUrl, setBotaoUrl] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 CARREGAR DADOS
  useEffect(() => {
    async function carregarHero() {
      try {
        const data = await fetchPaginaConteudo(supabase, "home", "hero");

        if (data) {
          setTitulo(data.titulo || "");

          const partes = (data.texto || "")
            .split("\n")
            .filter((l: string) => l.trim() !== "");

          setTexto(partes[0] || "");
          setBotaoTexto(partes[1] || "");
          setBotaoUrl(partes[2] || "");
        }
      } catch (err) {
        console.error("Erro geral:", err);
      }

      setLoading(false);
    }

    carregarHero();
  }, []);

  // 🔥 SALVAR (mesmo padrão do hero de editais)
  async function salvar() {
    setMensagem("Salvando...");
    setSalvando(true);

    try {
      const textoCompleto = [texto, botaoTexto, botaoUrl].join("\n");

      const { error } = await upsertPaginaConteudo(supabase, {
        pagina_slug: "home",
        bloco: "hero",
        titulo,
        texto: textoCompleto,
      });

      if (error) {
        console.error("Erro ao salvar:", error);
        setMensagem(`Erro ao salvar: ${error.message}`);
      } else {
        setMensagem("Salvo com sucesso.");
      }
    } catch (err) {
      console.error("Erro geral:", err);
      setMensagem("Erro inesperado.");
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
        <h1 className="admin-title">Home – Hero</h1>
        <p className="admin-subtitle">
          Edite o conteúdo principal da página inicial.
        </p>
      </div>

      <form
        className="admin-card"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <h2>Conteúdo</h2>

        <label>
          Título:
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label>
          Texto:
          <textarea
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            style={textareaStyle}
          />
        </label>

        <label>
          Texto do botão:
          <input
            value={botaoTexto}
            onChange={(e) => setBotaoTexto(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label>
          URL do botão:
          <input
            value={botaoUrl}
            onChange={(e) => setBotaoUrl(e.target.value)}
            style={inputStyle}
          />
        </label>

        <AdminSalvarButton salvando={salvando} onClick={salvar} />

        {mensagem && <p style={{ marginTop: 10 }}>{mensagem}</p>}
      </form>
    </>
  );
}

const inputStyle = {
  width: "100%",
  marginTop: 4,
  padding: "8px",
  borderRadius: 8,
  border: "1px solid #ccc",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
};