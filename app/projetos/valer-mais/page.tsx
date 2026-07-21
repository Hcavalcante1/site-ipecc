export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { PublicProjectDetail } from "@/components/public";

export default function ValerMais() {
  return (
    <PublicProjectDetail
      title="Programa Valer Mais"
      lead="Inclusão produtiva, geração de renda e fortalecimento comunitário."
    >
      <p className="public-page-lead">
        O Programa Valer Mais articula ações de valorização da educação pública,
        apoio pedagógico e mobilização da comunidade escolar.
      </p>
      <p>
        A iniciativa combina formação, protagonismo juvenil e parcerias locais
        para ampliar oportunidades e impacto social duradouro.
      </p>
    </PublicProjectDetail>
  );
}
