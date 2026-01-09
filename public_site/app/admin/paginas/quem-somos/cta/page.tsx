"use client";

import { useState } from "react";

export default function QuemSomosCtaAdminPage() {
  const [titulo, setTitulo] = useState(
    "Compromisso com impacto e transparência"
  );
  const [texto1, setTexto1] = useState(
    "Prestamos contas de nossas ações, resultados e investimentos, mantendo um relacionamento ético e responsável com a sociedade e com nossos parceiros. Trabalhamos com indicadores, evidências e melhoria contínua das metodologias."
  );
  const [texto2, setTexto2] = useState(
    "A cada projeto, reafirmamos a certeza de que educar, inspirar e transformar são os pilares para construir um futuro mais justo, plural e solidário."
  );

  const [conviteTitulo, setConviteTitulo] = useState("Junte-se a nós");
  const [conviteTexto, setConviteTexto] = useState(
    "A transformação social é fruto da colaboração. Se você é educador, artista, gestor público, instituição parceira ou cidadão comprometido com o futuro, queremos caminhar com você."
  );
  const [botaoTexto, setBotaoTexto] = useState("Fale com a APECC");
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
    console.log("QUEM SOMOS CTA (simulado):", {
      titulo,
      texto1,
      texto2,
      conviteTitulo,
      conviteTexto,
      botaoTexto,
      botaoLink,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Quem Somos — CTA final</h1>
        <p className="admin-subtitle">
          Edite o bloco final de compromisso e o convite para contato.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <h2 style={{ fontSize: ".95rem", marginBottom: 6 }}>
          Bloco de compromisso
        </h2>

        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={inputStyle}
        />

        <textarea
          value={texto1}
          onChange={(e) => setTexto1(e.target.value)}
          style={{ ...textAreaStyle, marginTop: 8 }}
        />

        <textarea
          value={texto2}
          onChange={(e) => setTexto2(e.target.value)}
          style={{ ...textAreaStyle, marginTop: 8, marginBottom: 16 }}
        />

        <h2 style={{ fontSize: ".95rem", marginBottom: 6 }}>Convite e botão</h2>

        <input
          value={conviteTitulo}
          onChange={(e) => setConviteTitulo(e.target.value)}
          style={inputStyle}
        />

        <textarea
          value={conviteTexto}
          onChange={(e) => setConviteTexto(e.target.value)}
          style={{ ...textAreaStyle, marginTop: 8, marginBottom: 12 }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
            fontSize: ".9rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>Texto do botão:</span>
            <input
              value={botaoTexto}
              onChange={(e) => setBotaoTexto(e.target.value)}
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>Link do botão (URL):</span>
            <input
              value={botaoLink}
              onChange={(e) => setBotaoLink(e.target.value)}
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </div>
        </div>

        <button type="submit" className="admin-button">
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

