"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const btnGreen = {
  background: "#22c55e",
  color: "#062e1b",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

export default function EditaisCTAAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editando, setEditando] = useState(false);

  // ESQUERDA
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");

  // DIREITA
  const [titulo2, setTitulo2] = useState("");
  const [descricao, setDescricao] = useState("");
  const [botaoTexto, setBotaoTexto] = useState("");
  const [botaoLink, setBotaoLink] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data } = await supabase
      .from("paginas_conteudo")
      .select("*")
      .eq("pagina_slug", "editais")
      .eq("bloco", "cta")
      .maybeSingle();

    if (data) {
      setTitulo(data.titulo || "");
      setTexto(data.texto || "");

      setTitulo2(data.extra?.titulo || "");
      setDescricao(data.extra?.descricao || "");
      setBotaoTexto(data.extra?.botao_texto || "");
      setBotaoLink(data.extra?.botao_link || "");
    }

    setLoading(false);
    setEditando(false);
  }

  async function salvar() {
    setMsg("Salvando...");

    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        {
          pagina_slug: "editais",
          bloco: "cta",
          titulo,
          texto,
          extra: {
            titulo: titulo2,
            descricao,
            botao_texto: botaoTexto,
            botao_link: botaoLink,
          },
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "pagina_slug,bloco",
        }
      );

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("CTA salvo com sucesso.");
      setEditando(false);
    }
  }

  if (loading) return <p>Carregando…</p>;

  return (
    <div className="admin-card">
      <h1>Editais — CTA</h1>
      <p>Configure o bloco final da página.</p>

      <div className="admin-form">
        <label>Título esquerdo</label>
        <input
          value={titulo}
          disabled={!editando}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label>Texto esquerdo</label>
        <textarea
          rows={4}
          value={texto}
          disabled={!editando}
          onChange={(e) => setTexto(e.target.value)}
        />

        <label>Título direito</label>
        <input
          value={titulo2}
          disabled={!editando}
          onChange={(e) => setTitulo2(e.target.value)}
        />

        <label>Descrição</label>
        <textarea
          rows={3}
          value={descricao}
          disabled={!editando}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <label>Texto do botão</label>
        <input
          value={botaoTexto}
          disabled={!editando}
          onChange={(e) => setBotaoTexto(e.target.value)}
        />

        <label>Link do botão</label>
        <input
          value={botaoLink}
          disabled={!editando}
          onChange={(e) => setBotaoLink(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {!editando && (
            <button
              className="admin-button"
              style={btnGreen}
              onClick={() => setEditando(true)}
            >
              Salvar alterações
            </button>
          )}

          {editando && (
            <button className="admin-button" onClick={salvar}>
              Salvar
            </button>
          )}
        </div>
      </div>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}