import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { resolveMediaPath } from "@/lib/media";
import { PublicHeroRolling } from "@/components/public";
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
      <section className="sobre">
        <div className="container">
          {!noticias || noticias.length === 0 ? (
            <p>Nenhuma notícia disponível.</p>
          ) : (
            <div className="cards__grid">
              {noticias.map((n: any) => (
                <article key={n.id} className="card">
                  <a
                    href={`/noticias/${n.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <img
                      src={
                        resolveMediaPath(n.imagem_url) ||
                        "/media/home/cards/projetos.jpg"
                      }
                      alt={n.titulo}
                      className="card__img"
                    />

                    <div className="card__body">
                      <h3 className="card__title">{n.titulo}</h3>
                      <p className="card__text">{n.resumo}</p>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
