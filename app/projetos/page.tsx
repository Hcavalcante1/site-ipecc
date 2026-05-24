// app/projetos/page.tsx

import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { resolveMediaPath } from "@/lib/media";
import { PublicHeroRolling } from "@/components/public";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ProjetosPage() {
  // HERO
  const { data: hero } = await supabase
    .from("paginas_conteudo")
    .select("titulo, texto")
    .eq("pagina_slug", "projetos")
    .eq("bloco", "hero")
    .maybeSingle();

  // INTRO
  const { data: intro } = await supabase
    .from("paginas_conteudo")
    .select("titulo, texto")
    .eq("pagina_slug", "projetos")
    .eq("bloco", "introducao")
    .maybeSingle();

  // EIXOS
  const { data: eixosData } = await supabase
    .from("paginas_eixos")
    .select("titulo, texto, imagem_url")
    .eq("pagina_slug", "projetos")
    .eq("bloco", "eixos")
    .order("ordem", { ascending: true });

  const eixos = eixosData || [];

  logPublicFetch({
    page: "/projetos",
    table: "paginas_conteudo+paginas_eixos",
    count: eixos.length,
  });

  // DESTAQUES
  const { data: destaquesData } = await supabase
    .from("paginas_conteudo")
    .select("*")
    .eq("pagina_slug", "projetos")
    .eq("bloco", "destaques")
    .maybeSingle();

  const destaques =
    typeof destaquesData?.extra === "string"
      ? JSON.parse(destaquesData.extra)
      : destaquesData?.extra || [];

  // METODOLOGIA
  const { data: metodologiaData } = await supabase
    .from("paginas_conteudo")
    .select("*")
    .eq("pagina_slug", "projetos")
    .eq("bloco", "metodologia")
    .maybeSingle();

  const etapas =
    typeof metodologiaData?.extra === "string"
      ? JSON.parse(metodologiaData.extra)
      : metodologiaData?.extra || [];

  // RESULTADOS
  const { data: numerosData } = await supabase
    .from("paginas_conteudo")
    .select("*")
    .eq("pagina_slug", "projetos")
    .eq("bloco", "numeros")
    .maybeSingle();

  const numeros =
    typeof numerosData?.extra === "string"
      ? JSON.parse(numerosData.extra)
      : numerosData?.extra || [];

  // CTA
  const { data: ctaData } = await supabase
    .from("paginas_conteudo")
    .select("*")
    .eq("pagina_slug", "projetos")
    .eq("bloco", "cta")
    .maybeSingle();

  const ctaExtra =
    typeof ctaData?.extra === "string"
      ? JSON.parse(ctaData.extra)
      : ctaData?.extra || {};

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/projetos/hero.webp"
        title={hero?.titulo ?? "Projetos"}
        text={
          hero?.texto ??
          "Nossos projetos unem educação, cultura e cidadania para fortalecer redes locais, ampliar o acesso a oportunidades e gerar impacto social duradouro."
        }
        ariaLabel="Projetos IPECC"
      />

      {/* INTRO */}
      <section
        className="sobre"
        aria-labelledby="intro-projetos"
        style={{ marginBottom: "6px" }}
      >
        <div className="container">
          <h2 id="intro-projetos">{intro?.titulo ?? "Como atuamos"}</h2>

          {intro?.texto ? (
            intro.texto.split("\n\n").map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p>
              O IPECC estrutura iniciativas em eixos complementares que se
              adaptam à realidade de cada território.
            </p>
          )}
        </div>
      </section>

      {/* EIXOS */}
      <section className="sobre" aria-label="Eixos temáticos">
        <div className="container">
          <div className="cards__grid">
            {eixos.length === 0 && (
              <p style={{ opacity: 0.6 }}>Nenhum eixo cadastrado.</p>
            )}

            {eixos.map((eixo, i) => (
              <article className="card" key={i}>
                <img
                  src={
                    eixo.imagem_url && eixo.imagem_url.trim() !== ""
                      ? resolveMediaPath(eixo.imagem_url)
                      : "/media/shared/fallbacks/eixo-default.jpg"
                  }
                  alt={eixo.titulo || "Eixo"}
                  className="card__img"
                />

                <div className="card__body">
                  <h3 className="card__title">{eixo.titulo}</h3>
                  <p className="card__text">{eixo.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* DESTAQUES */}
      <section className="destaques" aria-labelledby="destaques-projetos">
        <div className="container">
          <h2 id="destaques-projetos">
            {destaquesData?.titulo || "Destaques"}
          </h2>

          <div className="destaques__grid">
            {destaques.length === 0 && (
              <p style={{ opacity: 0.6 }}>Nenhum destaque cadastrado.</p>
            )}

            {destaques.map((item: any, i: number) => (
              <article key={i}>
                <img
                  src={
                    item.imagem_url && item.imagem_url.trim() !== ""
                      ? resolveMediaPath(item.imagem_url)
                      : "/media/home/destaques/acao-social.jpg"
                  }
                  alt={item.titulo || "Imagem"}
                />

                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* METODOLOGIA */}
      <section className="sobre">
        <div className="container">
          <h2>{metodologiaData?.titulo || "Metodologia"}</h2>

          <p>
            {metodologiaData?.texto ||
              "Nossa metodologia é baseada em etapas estruturadas e orientadas a resultados."}
          </p>

          <div style={{ marginTop: "20px", display: "grid", gap: "12px" }}>
            {etapas.map((e: any, i: number) => (
              <div key={i}>
                <strong>{e.titulo}</strong>
                <p style={{ margin: 0 }}>{e.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTADOS */}
      <section className="numeros">
        <div className="container">
          <h2>Resultados</h2>

          <div className="numeros__grid">
            {numeros.map((n: any, i: number) => (
              <div key={i}>
                <strong>{n.valor}</strong>
                <span>{n.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sobre-cta">
        <div className="container sobre-cta__grid">
          <div className="cta-left">
            <h2>{ctaData?.titulo || "Parcerias e editais"}</h2>

            <div style={{ marginTop: "12px" }}>
              {(ctaData?.texto
                ? ctaData.texto.split("\n\n")
                : ["Atuamos com convênios e cooperação técnica."]).map(
                (p: string, i: number) => (
                  <p key={i} style={{ marginBottom: "10px" }}>
                    {p}
                  </p>
                )
              )}
            </div>
          </div>

          <div className="cta-green__inner">
            <h3>{ctaExtra.tituloCta || "Vamos construir juntos"}</h3>
            <p>{ctaExtra.textoCta || "Apresente sua proposta."}</p>

            <a href={ctaExtra.linkBotao || "/contato"} className="btn-cta">
              {ctaExtra.rotuloBotao || "Fale com o IPECC"}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}