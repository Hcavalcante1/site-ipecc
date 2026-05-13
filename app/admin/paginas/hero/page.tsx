"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HeroPage() {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [botaoTexto, setBotaoTexto] = useState("");
  const [botaoUrl, setBotaoUrl] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔥 CARREGAR DADOS
  useEffect(() => {
    async function carregarHero() {
      try {
        const { data, error } = await supabase
          .from("paginas_conteudo")
          .select("*")
          .eq("pagina_slug", "home")
          .eq("bloco", "hero")
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Erro ao carregar hero:", error);
        }

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

  // 🔥 SALVAR
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensagem("Salvando...");

    try {
      const textoCompleto = [texto, botaoTexto, botaoUrl].join("\n");

      const { error } = await supabase
        .from("paginas_conteudo")
        .upsert(
          {
            pagina_slug: "home",
            bloco: "hero",
            titulo,
            texto: textoCompleto,
          },
          {
            onConflict: "pagina_slug,bloco",
          }
        );

      if (error) {
        console.error("Erro ao salvar:", error);
        setMensagem("Erro ao salvar.");
      } else {
        setMensagem("Salvo com sucesso.");
      }
    } catch (err) {
      console.error("Erro geral:", err);
      setMensagem("Erro inesperado.");
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

      <form className="admin-card" onSubmit={handleSubmit}>
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

        <button type="submit" className="admin-button">
          Salvar
        </button>

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