export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { PublicProjectDetail } from "@/components/public";

export default function ParceriasInstitucionais() {
  return (
    <PublicProjectDetail
      title="Parcerias Institucionais"
      lead="Cooperação técnica com poder público, escolas e organizações da sociedade civil."
    >
      <p className="public-page-lead">
        Projetos estruturados em parceria com órgãos públicos e entidades do
        terceiro setor, com objetivos claros e compromisso com transparência.
      </p>
      <p>
        As parcerias permitem ampliar alcance, compartilhar recursos e
        fortalecer políticas de educação, cultura e cidadania nos territórios de
        atuação do instituto.
      </p>
    </PublicProjectDetail>
  );
}
