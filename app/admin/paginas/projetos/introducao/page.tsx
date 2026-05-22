"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProjetosIntroducaoAdminPage() {
  const [titulo, setTitulo] = useState("");
  const [paragrafo1, setParagrafo1] = useState("");
  const [paragrafo2, setParagrafo2] = useState("");
  const [msg, setMsg] = useState("");
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
      const { data } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto")
        .eq("pagina_slug", "projetos")
        .eq("bloco", "introducao")
        .maybeSingle();

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
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMsg("Salvando...");

    const textoCompleto = `${paragrafo1}\n\n${paragrafo2}`;

    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "projetos",
          bloco: "introducao",
          titulo,
          texto: textoCompleto,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "pagina_slug,bloco",
        }
      );

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("Alterações salvas com sucesso.");
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

      <form className="admin-card" onSubmit={handleSubmit}>
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

        <button
          type="submit"
          className="admin-button"
          style={{ marginTop: 14 }}
        >
          Salvar alterações
        </button>

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