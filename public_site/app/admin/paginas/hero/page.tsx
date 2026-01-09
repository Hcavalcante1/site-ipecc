"use client";

import { useState } from "react";

export default function HeroPage() {
  const [titulo, setTitulo] = useState("Educação, Cultura e Cidadania");
  const [texto, setTexto] = useState(
    "Promovemos projetos e ações para fortalecer a educação, a cultura e a cidadania no Estado de São Paulo."
  );
  const [botaoTexto, setBotaoTexto] = useState("Conheça nossos projetos");
  const [botaoUrl, setBotaoUrl] = useState("/projetos");
  const [mensagem, setMensagem] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Hero:", { titulo, texto, botaoTexto, botaoUrl });
    setMensagem(
      "Alterações do Hero salvas (simulado). Depois vamos enviar isso para o Firebase."
    );
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Home – Hero (Tarja azul degradê)</h1>
        <p className="admin-subtitle">
          Edite aqui o título, texto e botão da abertura do site.
        </p>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>Conteúdo do Hero</h2>

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 10 }}>
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

        <label style={{ fontSize: ".9rem", display: "block", marginBottom: 10 }}>
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

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ fontSize: ".9rem" }}>
            Texto do botão:
            <input
              type="text"
              value={botaoTexto}
              onChange={(e) => setBotaoTexto(e.target.value)}
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

          <label style={{ fontSize: ".9rem" }}>
            URL do botão:
            <input
              type="text"
              value={botaoUrl}
              onChange={(e) => setBotaoUrl(e.target.value)}
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
        </div>

        <button type="submit" className="admin-button" style={{ marginTop: 16 }}>
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
