// app/admin/paginas/impacto/page.tsx
"use client";

import { useState } from "react";

export default function ImpactoPage() {
  const [titulo, setTitulo] = useState("Impacto Social");
  const [texto, setTexto] = useState(
    "A APECC promove inclusão, cidadania e transformação social por meio de projetos culturais, educacionais e comunitários que fortalecem o vínculo entre sociedade civil e poder público."
  );
  const [imagem, setImagem] = useState("/media/impacto-social.jpg");
  const [mensagem, setMensagem] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Impacto Social:", { titulo, texto, imagem });
    setMensagem(
      "Alterações de Impacto Social salvas (simulado). Depois vamos enviar isso para o Firebase."
    );
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Impacto Social</h1>
        <p className="admin-subtitle">
          Edite o título, o parágrafo e a imagem do bloco de Impacto Social.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>Conteúdo</h2>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
          Título:
          <input
            type="text"
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
        </label>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
          Texto:
          <textarea
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
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
        </label>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 8 }}>
          Caminho da imagem (em /public/media):
          <input
            type="text"
            value={imagem}
            onChange={(e) => setImagem(e.target.value)}
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
        </label>

        <button type="submit" className="admin-button">
          Salvar alterações
        </button>

        {mensagem && (
          <p style={{ marginTop: 10, fontSize: ".85rem", color: "#bbf7d0" }}>
            {mensagem}
          </p>
        )}
      </form>
    </>
  );
}
