"use client";

import { useState } from "react";

export default function ProjetosCtaAdminPage() {
  const [titulo, setTitulo] = useState("Projetos que geram impacto real");
  const [texto, setTexto] = useState(
    "Cada projeto da APECC é estruturado com objetivos claros, indicadores de resultados e compromisso com a transparência. Atuamos em parceria com o poder público, escolas e organizações da sociedade civil para ampliar o acesso à educação, cultura e cidadania."
  );
  const [convite, setConvite] = useState(
    "Se a sua instituição deseja conhecer melhor nossos projetos ou construir uma parceria, fale com a nossa equipe."
  );
  const [botaoTexto, setBotaoTexto] = useState("Fale sobre projetos");
  const [botaoLink, setBotaoLink] = useState("/contato");
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
    minHeight: 100,
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("PROJETOS CTA (simulado):", {
      titulo,
      texto,
      convite,
      botaoTexto,
      botaoLink,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Projetos — CTA final</h1>
        <p className="admin-subtitle">
          Edite o texto final de impacto e o convite para contato sobre
          projetos.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <label>Título do bloco:</label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={inputStyle}
        />

        <label style={{ marginTop: 8 }}>Texto principal:</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={textAreaStyle}
        />

        <label style={{ marginTop: 8 }}>Convite:</label>
        <textarea
          value={convite}
          onChange={(e) => setConvite(e.target.value)}
          style={textAreaStyle}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 12,
          }}
        >
          <div>
            <label>Texto do botão:</label>
            <input
              value={botaoTexto}
              onChange={(e) => setBotaoTexto(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label>Link do botão (URL):</label>
            <input
              value={botaoLink}
              onChange={(e) => setBotaoLink(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

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
