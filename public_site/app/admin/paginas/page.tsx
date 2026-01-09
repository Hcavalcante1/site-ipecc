// app/admin/paginas/page.tsx

export default function AdminPaginas() {
  return (
    <div className="admin-box">
      <h1 className="admin-h1">Páginas do Site</h1>
      <p className="admin-subtitle">
        Escolha qual conteúdo você deseja editar: blocos da página inicial (Início) ou páginas internas.
      </p>

      <h2 className="admin-h2">Início (Página inicial)</h2>

      <div className="admin-grid">
        <Card titulo="Hero (Tarja azul degradê)" rota="/admin/paginas/hero" />
        <Card titulo="Cards Principais" rota="/admin/paginas/cards" />
        <Card titulo="Destaques da Semana" rota="/admin/paginas/destaques" />
        <Card titulo="Números" rota="/admin/paginas/numeros" />
        <Card titulo="Impacto Social" rota="/admin/paginas/impacto" />
        <Card titulo="Depoimentos" rota="/admin/paginas/depoimentos" />
        <Card titulo="Sobre + CTA Final" rota="/admin/paginas/sobre-cta" />
      </div>

      <h2 className="admin-h2 spaced">Páginas internas</h2>

      <div className="admin-grid">
        <Card titulo="Quem Somos" rota="/admin/paginas/quem-somos" />
        <Card titulo="Projetos" rota="/admin/paginas/projetos" />
        <Card titulo="Transparência" rota="/admin/paginas/transparencia" />
        <Card titulo="Contato" rota="/admin/paginas/contato" />
        <Card titulo="Editais" rota="/admin/paginas/editais" />
      </div>
    </div>
  );
}

function Card({ titulo, rota }: { titulo: string; rota: string }) {
  return (
    <a href={rota} className="admin-card">
      <h3>{titulo}</h3>
      <button className="admin-button">Editar</button>
    </a>
  );
}

