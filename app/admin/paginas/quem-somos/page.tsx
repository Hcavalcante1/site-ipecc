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
      subtitulo='Escolha qual parte da página "Quem Somos" você deseja editar.'
    >
      <div className="admin-grid admin-grid--wide">
        <AdminHubCard
          titulo="Hero"
          descricao='Título e parágrafo inicial da página "Quem Somos".'
          href={r.hero}
          label="Editar Hero"
        />
        <AdminHubCard
          titulo="Bloco Principal"
          descricao="Título e textos principais de apresentação institucional."
          href={r.blocoPrincipal}
          label="Editar bloco principal"
        />
        <AdminHubCard
          titulo="Missão, Visão e Valores"
          descricao="Textos institucionais de missão, visão e valores."
          href={r.mvv}
          label="Editar missão, visão e valores"
        />
        <AdminHubCard
          titulo="Nossa atuação"
          descricao="Texto geral de atuação e os eixos (3 cards)."
            href={adminCanonicalRoutes.quemSomos.atuacao}
          label="Editar atuação e eixos"
        />
        <AdminHubCard
          titulo="CTA Final"
          descricao="Bloco de compromisso, convite e botão de contato."
          href={r.cta}
          label="Editar CTA final"
        />
      </div>
    </AdminPaginasHubLayout>
  );
}
