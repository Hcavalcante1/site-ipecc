"use client";

import { useState } from "react";

export default function ContatoAdminPage() {
  const [titulo, setTitulo] = useState("Contato");
  const [intro, setIntro] = useState(
    "Texto introdutório do contato (parcerias, informações, etc.)."
  );
  const [email, setEmail] = useState("contato@apecc.org.br");
  const [tel, setTel] = useState("(11) 0000-0000");
  const [endereco, setEndereco] = useState("Rua Exemplo, 123 – Suzano/SP");
  const [mapa, setMapa] = useState("https://maps.google.com");
  const [msg, setMsg] = useState("");

  function handleSubmit(e: any) {
    e.preventDefault();
    console.log("CONTATO (simulado):", {
      titulo,
      intro,
      email,
      tel,
      endereco,
      mapa,
    });
    setMsg("Alterações salvas (simulação).");
  }

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Página Interna — Contato</h1>
        <p className="admin-subtitle">
          Gerencie os dados de contato exibidos na área pública.
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
          <span>Título:</span>
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
          <span>Texto introdutório:</span>
          <textarea
            rows={3}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
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
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            fontSize: ".9rem",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>Email:</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>Telefone:</span>
            <input
              value={tel}
              onChange={(e) => setTel(e.target.value)}
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
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: ".9rem",
            marginBottom: 12,
          }}
        >
          <span>Endereço:</span>
          <input
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
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
            marginBottom: 16,
          }}
        >
          <span>Link Google Maps:</span>
          <input
            value={mapa}
            onChange={(e) => setMapa(e.target.value)}
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
