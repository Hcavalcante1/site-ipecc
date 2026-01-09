"use client";

import { useState } from "react";

export default function QuemSomosMvvAdminPage() {
  const [missao, setMissao] = useState(
    "Promover o desenvolvimento humano por meio da educação, da cultura e da cidadania, criando oportunidades de aprendizagem, expressão e convivência que fortalecem o tecido social e incentivam o engajamento comunitário."
  );
  const [visao, setVisao] = useState(
    "Ser referência no estado de São Paulo como instituição parceira do poder público e da sociedade civil, reconhecida pela qualidade e pelo impacto de seus projetos, pela gestão transparente e pelo compromisso com a transformação social sustentável."
  );
  const [valores, setValores] = useState(
    `Educação como direito: base da autonomia e da igualdade de oportunidades.
Cultura como expressão: diversidade como instrumento de inclusão e identidade.
Cidadania ativa: participação social e fortalecimento das comunidades.
Transparência e ética: responsabilidade pública e gestão íntegra.
Parceria e diálogo: pontes entre governo, sociedade civil e iniciativa privada.`
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
    console.log("QUEM SOMOS MVV (simulado):", {
      missao,
      visao,
      valores,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Quem Somos — Missão, Visão e Valores</h1>
        <p className="admin-subtitle">
          Edite os textos institucionais de missão, visão e valores.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <h2 style={{ fontSize: ".95rem", marginBottom: 6 }}>Missão</h2>
        <textarea
          value={missao}
          onChange={(e) => setMissao(e.target.value)}
          style={textAreaStyle}
        />

        <h2 style={{ fontSize: ".95rem", marginBottom: 6, marginTop: 16 }}>
          Visão
        </h2>
        <textarea
          value={visao}
          onChange={(e) => setVisao(e.target.value)}
          style={textAreaStyle}
        />

        <h2 style={{ fontSize: ".95rem", marginBottom: 6, marginTop: 16 }}>
          Valores
        </h2>
        <textarea
          value={valores}
          onChange={(e) => setValores(e.target.value)}
          style={{ ...textAreaStyle, minHeight: 180 }}
        />

        <button
          type="submit"
          className="admin-button"
          style={{ marginTop: 16 }}
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
