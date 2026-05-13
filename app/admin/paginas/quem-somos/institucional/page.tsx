"use client";

import { useState } from "react";

export default function QuemSomosInstitucionalAdminPage() {
  const [titulo, setTitulo] = useState("Sobre a APECC");
  const [paragrafo1, setParagrafo1] = useState(
    "A APECC é uma organização da sociedade civil que atua na promoção da educação, cultura e cidadania, desenvolvendo projetos que fortalecem comunidades e ampliam o acesso a oportunidades."
  );
  const [paragrafo2, setParagrafo2] = useState(
    "Com atuação em rede e foco em resultados, a entidade articula iniciativas com poder público, escolas, organizações parceiras e comunidades."
  );
  const [msg, setMsg] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("INSTITUCIONAL (simulado):", {
      titulo,
      paragrafo1,
      paragrafo2,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Quem Somos – Bloco institucional</h1>
        <p className="admin-subtitle">
          Edite o texto institucional principal da página &quot;Quem Somos&quot;.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: ".9rem",
            marginBottom: 12,
          }}
        >
          <span>Título do bloco:</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.8)",
              background: "rgba(15,23,42,.85)",
              color: "#e5e7eb",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: ".9rem",
            marginBottom: 12,
          }}
        >
          <span>Parágrafo 1:</span>
          <textarea
            rows={4}
            value={paragrafo1}
            onChange={(e) => setParagrafo1(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.8)",
              background: "rgba(15,23,42,.85)",
              color: "#e5e7eb",
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: ".9rem",
            marginBottom: 16,
          }}
        >
          <span>Parágrafo 2:</span>
          <textarea
            rows={4}
            value={paragrafo2}
            onChange={(e) => setParagrafo2(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.8)",
              background: "rgba(15,23,42,.85)",
              color: "#e5e7eb",
              resize: "vertical",
            }}
          />
        </div>

        <button type="submit" className="admin-button">
          Salvar alterações
        </button>

        {msg && (
          <p
            style={{
              marginTop: 10,
              fontSize: ".85rem",
              color: "#bbf7d0",
            }}
          >
            {msg}
          </p>
        )}
      </form>
    </>
  );
}
