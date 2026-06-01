import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { resolveMediaPath } from "@/lib/media";
import { PublicHeroRolling } from "@/components/public";
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

      <section className="sobre">
        <div className="container">
          {!eventos || eventos.length === 0 ? (
            <p>Nenhum evento disponível.</p>
          ) : (
            <div className="cards__grid">
              {eventos.map((e: any) => (
                <article key={e.id} className="card">
                  <img
                    src={
                      resolveMediaPath(e.imagem_url) ||
                      "/media/home/destaques/evento-cultural.jpg"
                    }
                    alt={e.titulo}
                    className="card__img"
                  />

                  <div className="card__body">
                    <h3 className="card__title">{e.titulo}</h3>

                    <p className="card__text">{e.descricao}</p>

                    <p className="card__text">
                      <strong>Data:</strong>{" "}
                      {e.data_evento
                        ? new Date(e.data_evento).toLocaleDateString("pt-BR")
                        : "Sem data"}
                    </p>

                    {e.horario ? (
                      <p className="card__text">
                        <strong>Horário:</strong> {e.horario}
                      </p>
                    ) : null}

                    <p className="card__text">
                      <strong>Local:</strong> {e.local || "Sem local"}
                    </p>

                    {e.whatsapp ? (
                      <WhatsAppLeadTrigger className="card__link" assunto="eventos">
                        Falar no WhatsApp
                      </WhatsAppLeadTrigger>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
