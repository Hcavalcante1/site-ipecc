import Link from "next/link";
import { PublicHeroRolling, PublicPageContent } from "@/components/public";
import PublicWhatsAppHelpLine from "@/components/public/PublicWhatsAppHelpLine";

export default function Acoes() {
  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/projetos/hero.webp"
        title="Ações e Iniciativas do IPECC"
        text="Panorama das ações, atividades públicas, oficinas, eventos comunitários e iniciativas em andamento."
        ariaLabel="Ações e iniciativas"
      />

      <PublicWhatsAppHelpLine assunto="projetos" />
      <PublicPageContent>
        <p className="public-page-lead">
          Nesta seção você encontra um panorama das ações, atividades públicas,
          oficinas, eventos comunitários e iniciativas em andamento.
        </p>

        <ul className="public-page-list">
          <li>
            Oficinas de Educação Cidadã — formação em direitos e participação
            social.{" "}
            <Link href="/projetos/oficinas-educacao-cidada">Ver ação →</Link>
          </li>

          <li>
            Cultura e Inclusão Social — acesso à arte, atividades culturais
            abertas e ações em territórios periféricos.{" "}
            <Link href="/projetos/cultura-inclusao-social">Ver ação →</Link>
          </li>

          <li>
            Parcerias Institucionais — cooperação técnica com poder público e
            sociedade civil.{" "}
            <Link href="/projetos/parcerias-institucionais">Ver ação →</Link>
          </li>

          <li>
            Programa Valer Mais — inclusão produtiva, geração de renda e
            fortalecimento comunitário.{" "}
            <Link href="/projetos/valer-mais">Ver ação →</Link>
          </li>
        </ul>

        <p style={{ marginTop: 24 }}>
          Para informações sobre editais, termos e prestação de contas:{" "}
          <Link href="/transparencia">Ir para Transparência →</Link>
        </p>
      </PublicPageContent>
    </>
  );
}
