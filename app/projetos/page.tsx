// app/projetos/page.tsx

import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { resolveMediaPath } from "@/lib/media";
import Link from "next/link";
import { PublicHeroRolling } from "@/components/public";
import PublicWhatsAppCtaLink from "@/components/public/PublicWhatsAppCtaLink";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";
import {
  fetchPaginaConteudo,
  parsePaginaExtra,
} from "@/lib/cms/paginasConteudoServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ProjetosPage() {
  const hero = await fetchPaginaConteudo(supabase, "projetos", "hero");
  const intro = await fetchPaginaConteudo(supabase, "projetos", "introducao");

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

  const destaquesData = await fetchPaginaConteudo(supabase, "projetos", "destaques");
  const destaques = parsePaginaExtra<unknown[]>(destaquesData?.extra, []);

  const metodologiaData = await fetchPaginaConteudo(
    supabase,
    "projetos",
    "metodologia"
  );
  const etapas = parsePaginaExtra<unknown[]>(metodologiaData?.extra, []);

  const numerosData = await fetchPaginaConteudo(supabase, "projetos", "numeros");
  const numeros = parsePaginaExtra<unknown[]>(numerosData?.extra, []);

  const ctaData = await fetchPaginaConteudo(supabase, "projetos", "cta");
  const ctaExtra = parsePaginaExtra<Record<string, unknown>>(ctaData?.extra, {});

  const { data: projetosSubData } = await supabase
    .from("paginas_conteudo")
    .select("pagina_slug, titulo, texto, imagem_url")
    .like("pagina_slug", "projetos-%")
    .eq("bloco", "corpo")
    .order("pagina_slug", { ascending: true });

  const projetosSub = projetosSubData || [];

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

      {/* PROJETOS - links para sub-páginas */}
  {projetosSub.length > 0 && (
    <section className="projetos-eixos" aria-labelledby="projetos-lista">
      <div className="container">
        <h2 id="projetos-lista">Nossos Projetos</h2>
        <div className="cards__grid">
          {projetosSub.map((proj: any) => {
            const slug = proj.pagina_slug.replace(/^projetos-/, "");
            return (
              <article className="card" key={proj.pagina_slug}>
                <img
                  src={
                    proj.imagem_url && proj.imagem_url.trim() !== ""
                      ? resolveMediaPath(proj.imagem_url)
                      : "/media/heroes/projetos/hero.webp"
                  }
                  alt={proj.titulo || "Projeto"}
                  className="card__img"
                />
                <div className="card__body">
                  <h3 className="card__title">{proj.titulo}</h3>
                  {proj.texto && <p className="card__text">{proj.texto}</p>}
                  <Link
                    href={`/projetos/${slug}`}
                    style={{ marginTop: 12, display: "inline-block", fontWeight: 600 }}
                  >
                    Ver projeto →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  )}

  {/* EIXOS */}
      <section className="projetos-eixos" aria-label="Eixos temáticos">
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

          <p style={{ marginTop: 20 }}>
            <Link href="/acoes">Ver panorama completo de ações e iniciativas em andamento →</Link>
          </p>
        </div>
      </section>

      {/* DESTAQUES */}
      <section className="destaques" aria-labelledby="destaques-projetos">
        <div className="container">
          <h2 id="destaques-projetos">
            {destaquesData?.titulo || "Destaques"}
          </h2>

          <div className="destaques__grid">
            {Array.isArray(destaques) && destaques.length === 0 && (
              <p style={{ opacity: 0.6 }}>Nenhum destaque cadastrado.</p>
            )}

            {Array.isArray(destaques) &&
              destaques.map((item: any, i: number) => (
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
            {Array.isArray(etapas) &&
              etapas.map((e: any, i: number) => (
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
            {Array.isArray(numeros) &&
              numeros.map((n: any, i: number) => (
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
            <h3>{String(ctaExtra.tituloCta || "Vamos construir juntos")}</h3>
            <p>{String(ctaExtra.textoCta || "Apresente sua proposta.")}</p>

            <PublicWhatsAppCtaLink
              className="btn-cta"
              href={String(ctaExtra.linkBotao || "/contato")}
              assunto="projetos"
            >
              {String(ctaExtra.rotuloBotao || "Fale com o IPECC")}
            </PublicWhatsAppCtaLink>
          </div>
        </div>
      </section>
    </>
  );
}
