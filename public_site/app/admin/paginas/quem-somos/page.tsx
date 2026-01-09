"use client";

import Link from "next/link";

export default function QuemSomosAdminIndexPage() {
  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Quem Somos — Blocos da Página</h1>
        <p className="admin-subtitle">
          Escolha qual parte da página &quot;Quem Somos&quot; você deseja editar.
        </p>
      </div>

      <div className="admin-grid">
        <section className="admin-card">
          <h2>Hero</h2>
          <p>Título e parágrafo inicial da página &quot;Quem Somos&quot;.</p>
          <Link href="/admin/paginas/quem-somos/hero" className="admin-button">
            Editar Hero
          </Link>
        </section>

        <section className="admin-card">
          <h2>Bloco Principal</h2>
          <p>Título e textos principais de apresentação institucional.</p>
          <Link
            href="/admin/paginas/quem-somos/bloco-principal"
            className="admin-button"
          >
            Editar bloco principal
          </Link>
        </section>

        <section className="admin-card">
          <h2>Missão, Visão e Valores</h2>
          <p>Textos institucionais de missão, visão e valores.</p>
          <Link href="/admin/paginas/quem-somos/mvv" className="admin-button">
            Editar missão, visão e valores
          </Link>
        </section>

        <section className="admin-card">
          <h2>Nossa atuação</h2>
          <p>Texto geral de atuação e os eixos (3 cards).</p>
          <Link href="/admin/paginas/quem-somos/atuacao" className="admin-button">
            Editar atuação e eixos
          </Link>
        </section>

        <section className="admin-card">
          <h2>CTA Final</h2>
          <p>Bloco de compromisso, convite e botão de contato.</p>
          <Link href="/admin/paginas/quem-somos/cta" className="admin-button">
            Editar CTA final
          </Link>
        </section>
      </div>
    </>
  );
}

