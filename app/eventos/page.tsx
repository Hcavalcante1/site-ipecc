import { supabase } from "@/lib/supabaseClient";
import { resolveMediaPath } from "@/lib/media";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function EventosPage() {
  const { data: eventos } = await supabase
    .from("eventos")
    .select("*")
    .eq("publicado", true)
    .order("data_evento", { ascending: true });

  return (
    <>
      {/* ===== HERO PADRÃO ===== */}
      <section className="hero-rolling">
        <div
          className="hero-rolling__inner"
          style={{
            ["--hero-bg-image" as any]: 'url("/media/heroes/eventos/hero.webp")',
          }}
        >
          <h1 className="hero__title">Eventos</h1>
          <p className="hero__text">
            Confira a agenda de atividades e ações do IPECC.
          </p>
        </div>
      </section>

      {/* ===== CONTEÚDO ===== */}
      <div style={{ padding: "40px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {!eventos || eventos.length === 0 ? (
            <p>Nenhum evento disponível.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 20,
              }}
            >
              {eventos.map((e: any) => (
                <div
                  key={e.id}
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 9",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={resolveMediaPath(e.imagem_url) || "/media/home/destaques/evento-cultural.jpg"}
                      alt={e.titulo}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>

                  <div style={{ padding: 16 }}>
                    <h3
                      style={{
                        marginBottom: 8,
                        fontSize: 20,
                        fontWeight: 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {e.titulo}
                    </h3>

                    <p
                      style={{
                        fontSize: 15,
                        opacity: 0.9,
                        marginBottom: 8,
                        lineHeight: 1.5,
                      }}
                    >
                      {e.descricao}
                    </p>

                    <p style={{ fontSize: 14, marginBottom: 4 }}>
                      📅{" "}
                      {e.data_evento
                        ? new Date(e.data_evento).toLocaleDateString("pt-BR")
                        : "Sem data"}
                    </p>

                    {e.horario && (
                      <p style={{ fontSize: 14, marginBottom: 4 }}>
                        ⏰ {e.horario}
                      </p>
                    )}

                    <p style={{ fontSize: 14, marginBottom: 6 }}>
                      📍 {e.local || "Sem local"}
                    </p>

                    {e.whatsapp && (
                      <a
                        href={`https://wa.me/${e.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#16a34a",
                          textDecoration: "none",
                        }}
                      >
                        💬 Falar no WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}