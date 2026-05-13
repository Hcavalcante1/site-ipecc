import { createClient } from "@/lib/supabaseServer";
import { resolveMediaPath } from "@/lib/media";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: { id: string };
};

export default async function NoticiaPage({ params }: Props) {
  const supabase = createClient(); // 🔥 CORREÇÃO PRINCIPAL

  const { data: noticia } = await supabase
    .from("noticias")
    .select("*")
    .eq("id", params.id)
    .eq("publicado", true)
    .maybeSingle(); // 🔥 evita erro se não achar

  if (!noticia) {
    return (
      <div style={{ padding: "40px 20px" }}>
        <h1>Notícia não encontrada</h1>
      </div>
    );
  }

  return (
    <>
      {/* ===== HERO PADRÃO ===== */}
      <section className="hero-rolling">
        <div
          className="hero-rolling__inner"
          style={{
            ["--hero-bg-image" as any]:
              'url("/media/heroes/noticias/hero.webp")',
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
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
          }}
        >
          {/* IMAGEM */}
          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              overflow: "hidden",
              borderRadius: 12,
              marginBottom: 30,
            }}
          >
            <img
              src={
                resolveMediaPath(noticia.imagem_url) ||
                "/media/home/cards/projetos.jpg"
              }
              alt={noticia.titulo}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          {/* TÍTULO */}
         <h1
  style={{
    marginBottom: 10,
    fontSize: 22, // 🔥 menor e mais equilibrado
    fontWeight: 600,
    lineHeight: 1.3,
  }}

          >
            {noticia.titulo}
          </h1>

          {/* RESUMO */}
          <p
            style={{
              fontSize: 16,
              opacity: 0.7,
              marginBottom: 20,
            }}
          >
            {noticia.resumo}
          </p>

          {/* CONTEÚDO */}
          <div
            style={{
              lineHeight: 1.6,
              fontSize: 16,
              color: "#374151",
            }}
          >
            {(noticia.conteudo || "")
              .split("\n")
              .filter((linha: string) => linha.trim() !== "")
              .map((linha: string, i: number) => (
                <p key={i} style={{ marginBottom: 14 }}>
                  {linha}
                </p>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}