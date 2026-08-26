import type { ReactNode } from "react";
import Link from "next/link";
import PublicHeroRolling from "./PublicHeroRolling";
import PublicPageContent from "./PublicPageContent";
import PublicWhatsAppHelpLine from "./PublicWhatsAppHelpLine";

type PublicProjectDetailProps = {
  title: string;
  lead?: string;
  image?: string;
  video?: string;
  children: ReactNode;
};

/** Layout padrão das páginas filhas de /projetos (sem alterar identidade visual). */
export default function PublicProjectDetail({
  title,
  lead,
  image,
  video,
  children,
}: PublicProjectDetailProps) {
  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/projetos/hero.webp"
        title={title}
        text={lead}
        ariaLabel={title}
      />
      <PublicWhatsAppHelpLine assunto="projetos" />
      <PublicPageContent>
        {image && (
          <img
            src={image}
            alt={title}
            style={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 8, marginBottom: 24, display: "block" }}
          />
        )}
        {children}
        {video && (
          <div style={{ marginTop: 24, borderRadius: 8, overflow: "hidden" }}>
            <iframe
              width="100%"
              style={{ aspectRatio: "16/9", border: "none" }}
              src={video.replace(
                /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
                "youtube.com/embed/$1"
              )}
              title="Vídeo do projeto"
              allowFullScreen
            />
          </div>
        )}
        <p style={{ marginTop: 24 }}>
          <Link href="/projetos">← Voltar para projetos</Link>
        </p>
      </PublicPageContent>
    </>
  );
}
