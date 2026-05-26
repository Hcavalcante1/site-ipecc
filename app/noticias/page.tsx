import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { resolveMediaPath } from "@/lib/media";
import { PublicHeroRolling, PublicPageContent } from "@/components/public";
import PublicWhatsAppHelpLine from "@/components/public/PublicWhatsAppHelpLine";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function NoticiasPage() {
  const { data: noticias, error } = await supabase
    .from("noticias")
    .select("*")
    .eq("publicado", true)
    .order("created_at", { ascending: false });

  logPublicFetch({
    page: "/noticias",
    table: "noticias",
    count: noticias?.length ?? 0,
    error: error?.message,
  });

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/noticias/hero.webp"
        title="Notícias"
        text="Acompanhe as ações, projetos e iniciativas do IPECC."
      />

      <PublicWhatsAppHelpLine
        assunto="outro"
        intro="Quer falar com a equipe sobre esta notícia?"
      />
      <PublicPageContent>
          {!noticias || noticias.length === 0 ? (
            <p>Nenhuma notícia disponível.</p>
          ) : (
            <div className="public-card-grid">
              {noticias.map((n: any) => (
                <a key={n.id} href={`/noticias/${n.id}`} className="public-card">
                  <div className="public-card__media">
                    <img
                      src={
                        resolveMediaPath(n.imagem_url) ||
                        "/media/home/cards/projetos.jpg"
                      }
                      alt={n.titulo}
                    />
                  </div>

                  <div className="public-card__body public-card__body--compact">
                    <h3 className="public-card__title public-card__title--compact">
                      {n.titulo}
                    </h3>
                    <p className="public-card__resumo">{n.resumo}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
      </PublicPageContent>
    </>
  );
}
