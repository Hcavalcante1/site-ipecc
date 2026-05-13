"use client";

import Link from "next/link";

const btnGreen = {
  background: "#22c55e",
  color: "#062e1b",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  cursor: "pointer",
  fontWeight: 600,
};

export default function ContatoAdminIndex() {
  return (
    <div className="admin-card">
      <h1>Página — Contato</h1>
      <p>
        Escolha qual bloco da página pública <strong>Contato</strong> você
        deseja editar.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        {/* HERO */}
        <div className="admin-card">
          <h3>Hero da página</h3>
          <p>Título e texto principal do topo da página.</p>
          <Link href="/admin/paginas/contato/hero">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* CANAIS */}
        <div className="admin-card">
          <h3>Canais oficiais</h3>
          <p>E-mails e telefones exibidos nos cards.</p>
          <Link href="/admin/paginas/contato/canais">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* ENDEREÇO */}
        <div className="admin-card">
          <h3>Endereço e mapa</h3>
          <p>Endereço físico e embed do Google Maps.</p>
          <Link href="/admin/paginas/contato/endereco">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* FORMULÁRIO */}
        <div className="admin-card">
          <h3>Formulário</h3>
          <p>Texto introdutório acima do formulário público.</p>
          <Link href="/admin/paginas/contato/formulario">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* CTA FINAL */}
        <div className="admin-card">
          <h3>CTA Final</h3>
          <p>Bloco verde final da página.</p>
          <Link href="/admin/paginas/contato/cta">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>
      </div>
    </div>
  );
}