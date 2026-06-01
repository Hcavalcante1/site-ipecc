import {
  AdminHubNavCard,
  AdminPaginasHubLayout,
} from "@/components/admin";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function AdminPaginas() {
  const inicio = adminCanonicalRoutes.inicio;

  return (
    <AdminPaginasHubLayout
      titulo="Páginas do Site"
      subtitulo="Escolha qual conteúdo você deseja editar: blocos da página inicial (Início) ou páginas internas."
    >
      <h2 className="admin-h2">Início (Página inicial)</h2>

      <div className="admin-grid">
        <AdminHubNavCard titulo="Hero (Tarja azul degradê)" href={inicio.hero} />
        <AdminHubNavCard titulo="Cards Principais" href={inicio.cards} />
        <AdminHubNavCard titulo="Destaques da Semana" href={inicio.destaques} />
        <AdminHubNavCard titulo="Números" href={inicio.numeros} />
        <AdminHubNavCard titulo="Impacto Social" href={inicio.impacto} />
        <AdminHubNavCard titulo="Depoimentos" href={inicio.depoimentos} />
        <AdminHubNavCard titulo="Sobre + CTA Final" href={inicio.sobreCta} />
      </div>

      <h2 className="admin-h2 spaced">Páginas internas</h2>

      <div className="admin-grid">
        <AdminHubNavCard
          titulo="Quem Somos"
          href={adminCanonicalRoutes.quemSomos.hub}
        />
        <AdminHubNavCard
          titulo="Projetos"
          href={adminCanonicalRoutes.projetos.hub}
        />
        <AdminHubNavCard
          titulo="Transparência"
          href={adminCanonicalRoutes.transparencia.hub}
        />
        <AdminHubNavCard
          titulo="Contato"
          href={adminCanonicalRoutes.contato.hub}
        />
        <AdminHubNavCard
          titulo="Editais"
          href={adminCanonicalRoutes.editaisCms.hub}
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
