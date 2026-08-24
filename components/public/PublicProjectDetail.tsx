import type { ReactNode } from "react";
import Link from "next/link";
import PublicHeroRolling from "./PublicHeroRolling";
import PublicPageContent from "./PublicPageContent";
import PublicWhatsAppHelpLine from "./PublicWhatsAppHelpLine";

type PublicProjectDetailProps = {
  title: string;
  lead?: string;
  image?: string;
  children: ReactNode;
};

/** Layout padrão das páginas filhas de /projetos (sem alterar identidade visual). */
export default function PublicProjectDetail({
  title,
  lead,
  image,
  children,
}: PublicProjectDetailProps) {
  return (
    <>
      <PublicHeroRolling
        bgImage={image || "/media/heroes/projetos/hero.webp"}
        title={title}
        text={lead}
        ariaLabel={title}
      />
      <PublicWhatsAppHelpLine assunto="projetos" />
      <PublicPageContent>
        {children}
        <p style={{ marginTop: 24 }}>
          <Link href="/projetos">← Voltar para projetos</Link>
        </p>
      </PublicPageContent>
    </>
  );
}
