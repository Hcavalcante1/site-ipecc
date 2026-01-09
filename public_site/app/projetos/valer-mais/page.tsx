"use client";

import { useState } from "react";

export default function ProjetosHeroAdminPage() {
  const [titulo, setTitulo] = useState("Projetos");
  const [texto, setTexto] = useState(
    "Conheça os projetos desenvolvidos pela APECC em parceria com escolas, comunidades e órgãos públicos, promovendo educação, cultura e cidadania em diferentes territórios."
  );
  const [msg, setMsg] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,.8)",
    background: "rgba(15,23,42,.85)",
    color: "#e6edf3",
    fontSize: ".9rem",
  };

  const textAreaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical",
    minHeight: 120,
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("PROJETOS HERO (simulado):", { titulo, texto });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — Hero / Introdução</h1>
        <p className="admin-subtitle">
          Edite o título e o parágrafo principal da página &quot;Projetos&quot;.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <label>Título:</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={inputStyle}
        />

        <label style={{ marginTop: 10 }}>Texto:</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={textAreaStyle}
        />

        <button
          type="submit"
          className="admin-button"
          style={{ marginTop: 14 }}
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
