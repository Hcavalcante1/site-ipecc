"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

export default function HeroProjetoAdminPage() {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");

  const sTextarea: CSSProperties = {
    minHeight: 120,
    resize: "vertical",
  };

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Hero – Projetos</h1>

      <div className="admin-form" style={{ marginTop: 24 }}>
        <label>Título:</label>
        <input
          className="admin-input"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label style={{ marginTop: 10 }}>Texto:</label>
        <textarea
          className="admin-textarea"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={sTextarea}
        />

        <button className="admin-button" style={{ marginTop: 14 }}>
          Salvar
        </button>
      </div>
    </div>
  );
}
