import { notFound } from "next/navigation";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { resolveMediaPath } from "@/lib/media";
import { PublicHeroRolling, PublicPageContent } from "@/components/public";
import PublicWhatsAppHelpLine from "@/components/public/PublicWhatsAppHelpLine";

export const revalidate = 120;

type Props = {
  params: { id: string };
};

export default async function NoticiaPage({ params }: Props) {
  const { data: noticia } = await supabase
    .from("noticias")
    .select("*")
    .eq("id", params.id)
    .eq("publicado", true)
    .maybeSingle();

  if (!noticia) notFound();

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/noticias/hero.webp"
        title="Notícias"
        text="Acompanhe as ações, projetos e iniciativas do IPECC."
      />

      <PublicWhatsAppHelpLine
        assunto="outro"
        intro="Dúvidas sobre esta notícia?"
      />
      <PublicPageContent className="public-content--article">
        <div className="public-article__cover">
          <img
            src={
              resolveMediaPath(noticia.imagem_url) ||
              "/media/home/cards/projetos.jpg"
            }
            alt={noticia.titulo}
          />
        </div>

        <h1 className="public-article__title">{noticia.titulo}</h1>

        <p className="public-article__resumo">{noticia.resumo}</p>

        <div className="public-article__body">
          {(noticia.conteudo || "")
            .split("\n")
            .filter((linha: string) => linha.trim() !== "")
            .map((linha: string, i: number) => (
              <p key={i}>{linha}</p>
            ))}
        </div>
      </PublicPageContent>
    </>
  );
}
