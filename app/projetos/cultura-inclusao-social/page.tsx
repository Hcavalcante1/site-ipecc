export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { PublicProjectDetail } from "@/components/public";

export default function CulturaInclusaoSocial() {
  return (
    <PublicProjectDetail
      title="Cultura e Inclusão Social"
      lead="Acesso à arte, atividades culturais abertas e ações em territórios periféricos."
    >
      <p className="public-page-lead">
        O IPECC desenvolve circuitos culturais, oficinas artísticas e ações de
        inclusão sociocultural em diferentes territórios.
      </p>
      <p>
        As atividades buscam ampliar o acesso à cultura, valorizar expressões
        locais e promover convivência entre comunidades, escolas e parceiros
        institucionais.
      </p>
    </PublicProjectDetail>
  );
}
