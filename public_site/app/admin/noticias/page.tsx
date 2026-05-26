"use client";

export default function AdminNoticiasPage() {
  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Noticias</h1>
        <p className="admin-subtitle">
          Planejamento do modulo de noticias institucionais para publicacao futura.
        </p>
      </div>

      <div className="admin-card">
        <h2>Em breve</h2>
        <p>
          Este modulo sera integrado ao CMS apos definicao de modelo editorial,
          permissoes e staging Supabase.
        </p>
      </div>
    </>
  );
}
