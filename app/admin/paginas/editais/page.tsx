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

export default function EditaisAdminIndex() {
  return (
    <div className="admin-card">
      <h1>Página — Editais</h1>
      <p>
        Escolha qual bloco da página pública <strong>Editais</strong> você
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
         <Link href="/admin/paginas/editais/hero">
  <button style={{ ...btnGreen, marginTop: 14 }}>Editar</button>
</Link>
        </div>

        {/* TEXTOS */}
        <div className="admin-card">
          <h3>Textos da página</h3>
          <p>Blocos textuais e conteúdo institucional da página.</p>
         <Link href="/admin/paginas/editais/textos">
  <button style={{ ...btnGreen, marginTop: 14 }}>Editar</button>
</Link>
        </div>

        {/* DOCUMENTOS */}
        <div className="admin-card">
          <h3>Documentos</h3>
          <p>Documentação exigida e lista de documentos para participação.</p>
          <Link href="/admin/paginas/editais/documentos">
  <button style={{ ...btnGreen, marginTop: 14 }}>Editar</button>
</Link>
        </div>

        {/* MURAL */}
        <div className="admin-card">
          <h3>Mural</h3>
          <p>Bloco de destaques, avisos ou conteúdos complementares.</p>
         <Link href="/admin/paginas/editais/mural">
  <button style={{ ...btnGreen, marginTop: 14 }}>Editar</button>
</Link>
        </div>

        {/* CTA */}
        <div className="admin-card">
          <h3>CTA / Chamada final</h3>
          <p>Bloco final com texto de apoio e botão de ação.</p>
         <Link href="/admin/paginas/editais/cta">
  <button style={{ ...btnGreen, marginTop: 14 }}>Editar</button>
</Link>
        </div>
      </div>
    </div>
  );
}