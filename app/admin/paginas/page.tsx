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
        <AdminHubNavCard
          titulo="Hero (Tarja azul degradê)"
          descricao="Edita o topo da página inicial. Aparece em /inicio e na home."
          href={inicio.hero}
        />
        <AdminHubNavCard
          titulo="Cards Principais"
          descricao="Edita os cards de acesso rápido da página inicial."
          href={inicio.cards}
        />
        <AdminHubNavCard
          titulo="Destaques da Semana"
          descricao="Edita os destaques com imagem exibidos na página inicial."
          href={inicio.destaques}
        />
        <AdminHubNavCard
          titulo="Números"
          descricao="Edita indicadores e métricas públicas da página inicial."
          href={inicio.numeros}
        />
        <AdminHubNavCard
          titulo="Impacto Social"
          descricao="Edita o bloco institucional de impacto exibido na página inicial."
          href={inicio.impacto}
        />
        <AdminHubNavCard
          titulo="Depoimentos"
          descricao="Edita depoimentos e mensagens institucionais da página inicial."
          href={inicio.depoimentos}
        />
        <AdminHubNavCard
          titulo="Sobre + CTA Final"
          descricao="Edita o bloco final de chamada para ação da página inicial."
          href={inicio.sobreCta}
        />
      </div>

      <h2 className="admin-h2 spaced">Páginas internas</h2>

      <div className="admin-grid">
        <AdminHubNavCard
          titulo="Quem Somos"
          descricao="Textos institucionais, atuação, missão, visão e valores. Aparece em /quem-somos."
          href={adminCanonicalRoutes.quemSomos.hub}
        />
        <AdminHubNavCard
          titulo="Projetos"
          descricao="Conteúdo público sobre projetos, eixos, destaques e metodologia. Aparece em /projetos."
          href={adminCanonicalRoutes.projetos.hub}
        />
        <AdminHubNavCard
          titulo="Transparência"
          descricao="Documentos, editais, convênios e prestação de contas. Aparece em /transparencia."
          href={adminCanonicalRoutes.transparencia.hub}
        />
        <AdminHubNavCard
          titulo="Contato"
          descricao="Canais oficiais, endereço, formulário e chamada final. Aparece em /contato."
          href={adminCanonicalRoutes.contato.hub}
        />
        <AdminHubNavCard
          titulo="Editais"
          descricao="Textos, documentação e chamada da página pública de editais. Aparece em /editais."
          href={adminCanonicalRoutes.editaisCms.hub}
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
