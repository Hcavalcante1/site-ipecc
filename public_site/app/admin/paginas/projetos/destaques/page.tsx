"use client";

import { useState } from "react";

type Destaque = {
  id: number;
  titulo: string;
  texto: string;
  imagem: string; // URL ou caminho da imagem
};

export default function ProjetosDestaquesAdminPage() {
  const [tituloBloco, setTituloBloco] = useState("Destaques dos nossos projetos");
  const [textoIntro, setTextoIntro] = useState(
    "Alguns dos projetos da APECC se destacam pela sua capacidade de mobilização, inovação e impacto social em diferentes territórios."
  );

  const [destaques, setDestaques] = useState<Destaque[]>([
    {
      id: 1,
      titulo: "Projetos em escolas públicas",
      texto:
        "Iniciativas que aproximam família, escola e comunidade, fortalecendo a educação pública com ações integradas de cidadania e cultura.",
      imagem: "/media/projetos-escolas.jpg",
    },
    {
      id: 2,
      titulo: "Circuitos culturais e eventos",
      texto:
        "Mostras, festivais e ações culturais que ampliam o acesso à arte e à cultura como direito de todos.",
      imagem: "/media/projetos-circuito-cultural.jpg",
    },
    {
      id: 3,
      titulo: "Parcerias com o poder público",
      texto:
        "Projetos realizados em cooperação com prefeituras, secretarias e conselhos, com foco em políticas públicas e fortalecimento institucional.",
      imagem: "/media/projetos-parcerias.jpg",
    },
  ]);

  const [msg, setMsg] = useState("");

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
    minHeight: 90,
    resize: "vertical",
  };

  function updateDestaque(id: number, campo: keyof Destaque, valor: string) {
    setDestaques((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [campo]: valor } : d))
    );
  }

  function addDestaque() {
    const novoId = Date.now();
    setDestaques((prev) => [
      ...prev,
      {
        id: novoId,
        titulo: "Novo destaque",
        texto: "Descrição do novo destaque.",
        imagem: "/media/nova-imagem.jpg",
      },
    ]);
  }

  function removeDestaque(id: number) {
    setDestaques((prev) => prev.filter((d) => d.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("PROJETOS DESTAQUES (simulado):", {
      tituloBloco,
      textoIntro,
      destaques,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Destaques</h1>
        <p className="admin-subtitle">
          Edite o bloco de destaques dos projetos (título, texto introdutório e
          cards com imagem).
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <label>Título do bloco:</label>
        <input
          value={tituloBloco}
          onChange={(e) => setTituloBloco(e.target.value)}
          style={sInput}
        />

        <label style={{ marginTop: 10 }}>Texto introdutório:</label>
        <textarea
          value={textoIntro}
          onChange={(e) => setTextoIntro(e.target.value)}
          style={{ ...sTextarea, minHeight: 110 }}
        />

        <div
          style={{
            marginTop: 20,
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: ".9rem",
          }}
        >
          <span>Destaques cadastrados:</span>

          <button
            type="button"
            onClick={addDestaque}
            className="admin-button"
            style={{ padding: "5px 12px", fontSize: ".8rem" }}
          >
            + Adicionar destaque
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {destaques.map((d) => (
            <div
              key={d.id}
              style={{
                background: "rgba(15,23,42,.9)",
                borderRadius: 12,
                padding: 14,
                border: "1px solid rgba(148,163,184,.5)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: ".8rem", opacity: 0.7 }}>
                  Destaque #{d.id}
                </span>

                <button
                  type="button"
                  onClick={() => removeDestaque(d.id)}
                  style={{
                    marginLeft: "auto",
                    background: "rgba(127,29,29,.7)",
                    border: "1px solid rgba(248,113,113,.7)",
                    borderRadius: 6,
                    padding: "3px 10px",
                    color: "#fee2e2",
                    cursor: "pointer",
                    fontSize: ".75rem",
                  }}
                >
                  Remover
                </button>
              </div>

              <label>Título do destaque:</label>
              <input
                value={d.titulo}
                onChange={(e) =>
                  updateDestaque(d.id, "titulo", e.target.value)
                }
                style={sInput}
              />

              <label>Texto do destaque:</label>
              <textarea
                value={d.texto}
                onChange={(e) =>
                  updateDestaque(d.id, "texto", e.target.value)
                }
                style={sTextarea}
              />

              <label>URL da imagem (ou caminho):</label>
              <input
                value={d.imagem}
                onChange={(e) =>
                  updateDestaque(d.id, "imagem", e.target.value)
                }
                style={sInput}
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="admin-button"
          style={{ marginTop: 18 }}
        >
          Salvar alterações
        </button>

        {msg && (
          <p style={{ marginTop: 10, color: "#bbf7d0", fontSize: ".8rem" }}>
            {msg}
          </p>
        )}
      </form>
    </>
  );
}
