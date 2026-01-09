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

export default function TransparenciaAdminIndex() {
  return (
    <div className="admin-card">
      <h1>Página — Transparência</h1>
      <p>
        Escolha qual bloco da página pública <strong>Transparência</strong> você
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
          <Link href="/admin/paginas/transparencia/hero">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* COMPROMISSOS */}
        <div className="admin-card">
          <h3>Compromissos e princípios</h3>
          <p>Texto institucional sobre ética, transparência e governança.</p>
          <Link href="/admin/paginas/transparencia/compromissos">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* DOCUMENTOS */}
        <div className="admin-card">
          <h3>Documentos institucionais</h3>
          <p>
            Estatuto, atas, CNDs, políticas e demais documentos públicos.
          </p>
          <Link href="/admin/paginas/transparencia/documentos">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* PARCERIAS */}
        <div className="admin-card">
          <h3>Parcerias</h3>
          <p>Termos, convênios e instrumentos de parceria.</p>
          <Link href="/admin/paginas/transparencia/parcerias">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* PRESTAÇÃO DE CONTAS */}
        <div className="admin-card">
          <h3>Prestação de contas</h3>
          <p>Relatórios técnicos e financeiros.</p>
          <Link href="/admin/paginas/transparencia/prestacao">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* LGPD */}
        <div className="admin-card">
          <h3>LGPD</h3>
          <p>Política de privacidade, contatos e proteção de dados.</p>
          <Link href="/admin/paginas/transparencia/lgpd">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>

        {/* CTA */}
        <div className="admin-card">
          <h3>CTA / Acesso rápido</h3>
          <p>Bloco final com botão de acesso a documentos.</p>
          <Link href="/admin/paginas/transparencia/cta">
            <button style={btnGreen}>Editar</button>
          </Link>
        </div>
      </div>
    </div>
  );
}







