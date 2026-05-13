"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { resolveMediaPath } from "@/lib/media";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function QuemSomosPage() {

  const [hero, setHero] = useState<{ titulo?: string; texto?: string }>({});
  const [bloco, setBloco] = useState<{ titulo?: string; texto?: string }>({});
  const [mvv, setMvv] = useState<any[]>([]);

  const [atuacao, setAtuacao] = useState<any[]>([]);
  const [introAtuacao, setIntroAtuacao] = useState("");

  const [cta, setCta] = useState<any>({});

  useEffect(() => {
    async function loadData() {

      const { data: heroData } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto")
        .eq("pagina_slug", "quem-somos")
        .eq("bloco", "hero")
        .maybeSingle();

      if (heroData) setHero(heroData);

      const { data: blocoData } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto")
        .eq("pagina_slug", "quem-somos")
        .eq("bloco", "bloco-principal")
        .maybeSingle();

      if (blocoData) setBloco(blocoData);

      const { data: mvvData } = await supabase
        .from("paginas_conteudo")
        .select("extra")
        .eq("pagina_slug", "quem-somos")
        .eq("bloco", "mvv")
        .maybeSingle();

      if (mvvData?.extra) {
        setMvv(
          typeof mvvData.extra === "string"
            ? JSON.parse(mvvData.extra)
            : mvvData.extra
        );
      }

      const { data: atuacaoData } = await supabase
        .from("paginas_conteudo")
        .select("bloco, titulo, texto, imagem_url")
        .eq("pagina_slug", "quem-somos")
        .like("bloco", "atuacao%");

      if (atuacaoData) {
        const cards: any[] = [];

        atuacaoData.forEach((item) => {
          if (item.bloco === "atuacao_intro") {
            setIntroAtuacao(item.texto || "");
          }

          if (item.bloco.startsWith("atuacao_cards_")) {
            cards.push(item);
          }
        });

        cards.sort((a, b) => a.bloco.localeCompare(b.bloco));

        setAtuacao(cards);
      }

      const { data: ctaData } = await supabase
        .from("paginas_conteudo")
        .select("titulo, texto, extra")
        .eq("pagina_slug", "quem-somos")
        .eq("bloco", "cta")
        .maybeSingle();

      if (ctaData) setCta(ctaData);
    }

    loadData();
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="hero-rolling">
        <div
          className="hero-rolling__inner"
          style={{
            ["--hero-bg-image" as any]: 'url("/media/heroes/quem-somos/hero.webp")',
          }}
        >
          <h1 className="hero__title">{hero.titulo}</h1>
          <p className="hero__text">{hero.texto}</p>
        </div>
      </section>

      {/* BLOCO */}
      <section className="sobre">
        <div className="container">
          <h2>{bloco.titulo}</h2>

          {(bloco.texto || "").split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {/* MVV */}
      <section className="sobre">
        <div className="container">
          <div className="destaques__grid">
            {mvv.map((item, i) => {
              const tipo = item.titulo
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

              return (
                <article key={i} className={`mvv-card mvv-${tipo}`}>
                  <h3>{item.titulo}</h3>

                  {item.titulo === "Valores" ? (
                    <ul>
                      {item.texto.split("\n").map((l: string, idx: number) => (
                        <li key={idx}>{l}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{item.texto}</p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ATUAÇÃO */}
      <section className="sobre">
        <div className="container">
          <h2>Nossa atuação</h2>

          <p>{introAtuacao}</p>

          <div className="cards__grid" style={{ marginTop: 16 }}>
            {atuacao.map((item, i) => (
              <article className="card" key={i}>
                {item.imagem_url && item.imagem_url.trim() !== "" && (
                  <img
                    src={resolveMediaPath(item.imagem_url)}
                    className="card__img"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}

                <div className="card__body">
                  <h3 className="card__title">{item.titulo}</h3>
                  <p className="card__text">{item.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sobre-cta">
        <div className="container sobre-cta__grid">

          <div className="sobre">
            <h2>{cta.titulo}</h2>

            {(cta.texto || "").split("\n\n").map((p: string, i: number) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="cta-green__inner">
            <h3>{cta.extra?.conviteTitulo}</h3>
            <p>{cta.extra?.conviteTexto}</p>

            <a href={cta.extra?.botaoLink} className="btn-cta">
              {cta.extra?.botaoTexto}
            </a>
          </div>

        </div>
      </section>

      {/* 🔥 CORREÇÃO ÚNICA: TEXTO BRANCO NOS CARDS */}
      <style jsx>{`
        .mvv-card {
          padding: 16px;
          border-radius: 12px;
          color: #fff !important;
        }

        .mvv-missao {
          background: linear-gradient(135deg, #16a34a, #22c55e);
        }

        .mvv-visao {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
        }

        .mvv-valores {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
        }

        .mvv-card h3,
        .mvv-card p,
        .mvv-card li {
          color: #fff !important;
        }
      `}</style>
    </>
  );
}