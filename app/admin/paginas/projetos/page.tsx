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
          Escolha qual bloco da página pública <strong>Projetos</strong> você deseja
          editar.
        </>
      }
    >
      <div className="admin-grid admin-grid--wide">
        <AdminHubCard
          titulo="Hero"
          descricao="Título e texto do topo da página."
          href={r.hero}
        />
        <AdminHubCard
          titulo="Introdução"
          descricao="Texto inicial da página."
          href={r.introducao}
        />
        <AdminHubCard
          titulo="Eixos"
          descricao="Cards de atuação do projeto."
          href={r.eixos}
        />
        <AdminHubCard
          titulo="Destaques"
          descricao="Projetos em evidência com imagem."
          href={r.destaques}
        />
        <AdminHubCard
          titulo="Metodologia"
          descricao="Texto e estrutura de execução."
          href={r.metodologia}
        />
        <AdminHubCard
          titulo="Números"
          descricao="Indicadores e métricas."
          href={r.numeros}
        />
        <AdminHubCard
          titulo="CTA Final"
          descricao="Bloco verde final da página."
          href={r.cta}
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
