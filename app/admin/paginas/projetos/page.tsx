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

export default function ProjetosAdminIndex() {
  return (
    <div className="admin-card">
      <h1>Página — Projetos</h1>
      <p>
        Escolha qual bloco da página pública <strong>Projetos</strong> você deseja editar.
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
          <h3>Hero</h3>
          <p>Título e texto do topo da página.</p>
          <Link href="/admin/paginas/projetos/hero">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* INTRODUÇÃO */}
        <div className="admin-card">
          <h3>Introdução</h3>
          <p>Texto inicial da página.</p>
          <Link href="/admin/paginas/projetos/introducao">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* EIXOS */}
        <div className="admin-card">
          <h3>Eixos</h3>
          <p>Cards de atuação do projeto.</p>
          <Link href="/admin/paginas/projetos/eixos">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* DESTAQUES */}
        <div className="admin-card">
          <h3>Destaques</h3>
          <p>Projetos em evidência com imagem.</p>
          <Link href="/admin/paginas/projetos/destaques">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* METODOLOGIA */}
        <div className="admin-card">
          <h3>Metodologia</h3>
          <p>Texto e estrutura de execução.</p>
          <Link href="/admin/paginas/projetos/metodologia">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* NÚMEROS */}
        <div className="admin-card">
          <h3>Números</h3>
          <p>Indicadores e métricas.</p>
          <Link href="/admin/paginas/projetos/numeros">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* CTA */}
        <div className="admin-card">
          <h3>CTA Final</h3>
          <p>Bloco verde final da página.</p>
          <Link href="/admin/paginas/projetos/cta">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

      </div>
    </div>
  );
}