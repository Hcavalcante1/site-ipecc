"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

export default function QuemSomosHeroAdminPage() {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");

  const textAreaStyle: CSSProperties = {
    resize: "vertical" as const,
    minHeight: 120,
    width: "100%",
    padding: "10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#0f172a",
    color: "#fff",
    fontSize: "14px",
  };

  return (
    <div className="admin-box">
      <h1 className="admin-h1">Hero – Quem Somos</h1>

      <div className="admin-form" style={{ marginTop: 24 }}>
        <label>Título</label>
        <input
          className="admin-input"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <label style={{ marginTop: 10 }}>Texto</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={textAreaStyle}
        />

        <button className="admin-button" style={{ marginTop: 14 }}>
          Salvar
        </button>
      </div>
    </div>
  );
}
