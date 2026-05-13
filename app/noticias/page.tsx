import { supabase } from "@/lib/supabaseClient";
import { resolveMediaPath } from "@/lib/media";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function NoticiasPage() {
  const { data: noticias } = await supabase
    .from("noticias")
    .select("*")
    .eq("publicado", true)
    .order("created_at", { ascending: false });

  return (
    <>
      {/* ===== HERO PADRÃO ===== */}
      <section className="hero-rolling">
        <div
          className="hero-rolling__inner"
          style={{
            ["--hero-bg-image" as any]: 'url("/media/heroes/noticias/hero.webp")',
          }}
        >
          <h1 className="hero__title">Notícias</h1>
          <p className="hero__text">
            Acompanhe as ações, projetos e iniciativas do IPECC.
          </p>
        </div>
      </section>

      {/* ===== CONTEÚDO ===== */}
      <div style={{ padding: "40px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {!noticias || noticias.length === 0 ? (
            <p>Nenhuma notícia disponível.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 20,
              }}
            >
              {noticias.map((n: any) => (
                <a
                  key={n.id}
                  href={`/noticias/${n.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
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
                      src={resolveMediaPath(n.imagem_url) || "/media/home/cards/projetos.jpg"}
                      alt={n.titulo}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>

                  <div style={{ padding: 14 }}>
                    <h3 style={{ marginBottom: 6 }}>{n.titulo}</h3>
                    <p style={{ fontSize: 13, opacity: 0.7 }}>
                      {n.resumo}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}