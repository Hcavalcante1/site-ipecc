import {
  AdminHubCard,
  AdminPaginasHubLayout,
} from "@/components/admin";
import { adminCanonicalRoutes } from "@/lib/admin/canonicalAdminRoutes";

export default function ProjetosAdminIndex() {
  const r = adminCanonicalRoutes.projetos;

  return (
    <AdminPaginasHubLayout
      titulo="Página — Projetos"
      subtitulo={
        <>
          Edite os blocos exibidos na página pública <strong>Projetos</strong>.
          Use esta área para apresentar eixos, iniciativas, metodologia e chamadas
          relacionadas aos projetos do IPECC.
        </>
      }
    >
      <div className="admin-grid admin-grid--wide">
        <AdminHubCard
          titulo="Destaque / topo"
          descricao="Título e texto principal do topo da página pública /projetos."
          href={r.hero}
        />
        <AdminHubCard
          titulo="Introdução"
          descricao="Texto inicial que contextualiza a atuação em projetos."
          href={r.introducao}
        />
        <AdminHubCard
          titulo="Eixos"
          descricao="Cards de eixos de atuação exibidos na página /projetos."
          href={r.eixos}
        />
        <AdminHubCard
          titulo="Destaques"
          descricao="Projetos em evidência com imagem e texto público."
          href={r.destaques}
        />
        <AdminHubCard
          titulo="Metodologia"
          descricao="Texto sobre metodologia, execução e organização dos projetos."
          href={r.metodologia}
        />
        <AdminHubCard
          titulo="Números"
          descricao="Indicadores e métricas públicas relacionados aos projetos."
          href={r.numeros}
        />
        <AdminHubCard
          titulo="Chamada final"
          descricao="Chamada final da página /projetos, com texto e ação."
          href={r.cta}
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
