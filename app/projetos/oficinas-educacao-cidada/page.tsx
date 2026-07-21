export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { PublicProjectDetail } from "@/components/public";

export default function OficinasEducacaoCidada() {
  return (
    <PublicProjectDetail
      title="Oficinas de Educação Cidadã"
      lead="Formação em direitos, convivência e participação social para jovens, adultos e lideranças comunitárias."
    >
      <p className="public-page-lead">
        As oficinas de educação cidadã realizadas pelo IPECC promovem formação
        em direitos, deveres, convivência e participação social.
      </p>
      <p>
        A iniciativa inclui rodas de conversa em escolas públicas,
        capacitações temáticas e ações itinerantes em territórios vulneráveis.
      </p>
      <p>
        Objetivo: fortalecer consciência social e incentivar o protagonismo
        comunitário.
      </p>
    </PublicProjectDetail>
  );
}
