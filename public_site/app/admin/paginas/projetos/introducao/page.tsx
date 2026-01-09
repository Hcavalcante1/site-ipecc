"use client";

import { useState } from "react";

export default function ProjetosIntroducaoAdminPage() {
  const [titulo, setTitulo] = useState("Como atuamos em nossos projetos");
  const [paragrafo1, setParagrafo1] = useState(
    "A APECC desenvolve projetos que articulam educação, cultura e cidadania em diferentes territórios, sempre em diálogo com as necessidades locais e em parceria com escolas, comunidades e órgãos públicos."
  );
  const [paragrafo2, setParagrafo2] = useState(
    "Cada projeto é estruturado com objetivos claros, metodologia participativa e acompanhamento próximo das equipes envolvidas, garantindo ações consistentes, resultados mensuráveis e impacto social duradouro."
  );
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
    minHeight: 110,
    resize: "vertical",
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("PROJETOS INTRODUCAO (simulado):", {
      titulo,
      paragrafo1,
      paragrafo2,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Introdução</h1>
        <p className="admin-subtitle">
          Edite o bloco introdutório da página &quot;Projetos&quot; (título e
          dois parágrafos explicando como a APECC atua).
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
