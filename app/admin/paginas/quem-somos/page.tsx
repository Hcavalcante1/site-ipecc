import {
  AdminHubCard,
  AdminPaginasHubLayout,
} from "@/components/admin";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function QuemSomosAdminIndexPage() {
  const r = adminCanonicalRoutes.quemSomos;

  return (
    <AdminPaginasHubLayout
      titulo="Quem Somos — Blocos da Página"
      subtitulo='Edite os blocos institucionais exibidos na página pública "/quem-somos". Use esta área para manter apresentação, identidade e atuação do IPECC atualizadas.'
    >
      <div className="admin-grid admin-grid--wide">
        <AdminHubCard
          titulo="Hero"
          descricao='Título e parágrafo inicial da página pública "/quem-somos".'
          href={r.hero}
          label="Editar Hero"
        />
        <AdminHubCard
          titulo="Bloco Principal"
          descricao="Apresentação institucional principal exibida em /quem-somos."
          href={r.blocoPrincipal}
          label="Editar bloco principal"
        />
        <AdminHubCard
          titulo="Missão, Visão e Valores"
          descricao="Diretrizes institucionais que orientam a atuação pública do IPECC."
          href={r.mvv}
          label="Editar missão, visão e valores"
        />
        <AdminHubCard
          titulo="Nossa atuação"
          descricao="Texto geral e eixos de atuação exibidos em cards na página /quem-somos."
            href={adminCanonicalRoutes.quemSomos.atuacao}
          label="Editar atuação e eixos"
        />
        <AdminHubCard
          titulo="CTA Final"
          descricao="Chamada final da página, com convite e botão de contato."
          href={r.cta}
          label="Editar CTA final"
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
