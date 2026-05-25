import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { resolveMediaPath } from "@/lib/media";
import { PublicHeroRolling, PublicPageContent } from "@/components/public";
import WhatsAppLeadTrigger from "@/components/public/WhatsAppLeadTrigger";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function EventosPage() {
  const { data: eventos, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("publicado", true)
    .order("data_evento", { ascending: true });

  logPublicFetch({
    page: "/eventos",
    table: "eventos",
    count: eventos?.length ?? 0,
    error: error?.message,
  });

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/eventos/hero.webp"
        title="Eventos"
        text="Confira a agenda de atividades e ações do IPECC."
      />

      <PublicPageContent>
          {!eventos || eventos.length === 0 ? (
            <p>Nenhum evento disponível.</p>
          ) : (
            <div className="public-card-grid">
              {eventos.map((e: any) => (
                <article key={e.id} className="public-card">
                  <div className="public-card__media">
                    <img
                      src={
                        resolveMediaPath(e.imagem_url) ||
                        "/media/home/destaques/evento-cultural.jpg"
                      }
                      alt={e.titulo}
                    />
                  </div>

                  <div className="public-card__body">
                    <h3 className="public-card__title">{e.titulo}</h3>

                    <p className="public-card__text">{e.descricao}</p>

                    <p className="public-card__meta">
                      📅{" "}
                      {e.data_evento
                        ? new Date(e.data_evento).toLocaleDateString("pt-BR")
                        : "Sem data"}
                    </p>

                    {e.horario ? (
                      <p className="public-card__meta">⏰ {e.horario}</p>
                    ) : null}

                    <p className="public-card__meta">
                      📍 {e.local || "Sem local"}
                    </p>

                    {e.whatsapp ? (
                      <WhatsAppLeadTrigger className="public-card__link" assunto="eventos">
                        💬 Falar no WhatsApp
                      </WhatsAppLeadTrigger>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
      </PublicPageContent>
    </>
  );
}
