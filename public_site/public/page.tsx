// app/page.tsx
import Image from "next/image";

/**
 * Imagens criadas (SVG) — aparecem de imediato e podem ser trocadas depois.
 * Se quiser usar arquivos reais, coloque-os em /public/media e troque as 3
 * constantes abaixo por:
 *   const imgProjetos = "/media/projetos.jpg";
 *   const imgTransparencia = "/media/transparencia.jpg";
 *   const imgContato = "/media/contato.jpg";
 */
const imgProjetos =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <defs>
        <linearGradient id='g1' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#0b6bff'/>
          <stop offset='100%' stop-color='#1387d6'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='800' fill='url(#g1)'/>
      <text x='50%' y='50%' font-size='64' fill='white' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'>Projetos</text>
    </svg>`
  );

const imgTransparencia =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <defs>
        <linearGradient id='g2' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#0a67c2'/>
          <stop offset='100%' stop-color='#13a1e6'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='800' fill='url(#g2)'/>
      <text x='50%' y='50%' font-size='64' fill='white' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'>Transparência</text>
    </svg>`
  );

const imgContato =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>
      <defs>
        <linearGradient id='g3' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#01c2a4'/>
          <stop offset='100%' stop-color='#16a34a'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='800' fill='url(#g3)'/>
      <text x='50%' y='50%' font-size='64' fill='white' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif'>Contato</text>
    </svg>`
  );

export default function HomePage() {
  return (
    <>
      {/* ===== CONTEÚDO QUE ROLA (o topo todo é fixo) ===== */}
      <section className="cards">
        <div className="container cards__grid">
          {/* Projetos */}
          <article className="card">
            <div className="card__media-wrap">
              <Image
                src={imgProjetos}
                alt="Projetos APECC"
                fill
                sizes="(max-width: 980px) 100vw, 33vw"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
            <div className="card__body">
              <h3 className="card__title">Projetos</h3>
              <p className="card__text">
                Conheça nossas iniciativas e resultados nas áreas de educação,
                cultura, cidadania e desenvolvimento social.
              </p>
              <a href="/projetos" className="card__link">Ver projetos</a>
            </div>
          </article>

          {/* Transparência */}
          <article className="card">
            <div className="card__media-wrap">
              <Image
                src={imgTransparencia}
                alt="Transparência APECC"
                fill
                sizes="(max-width: 980px) 100vw, 33vw"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="card__body">
              <h3 className="card__title">Transparência</h3>
              <p className="card__text">
                Acompanhe editais, contratos, termos de parceria e relatórios
                institucionais.
              </p>
              <a href="/transparencia" className="card__link">Acesso à transparência</a>
            </div>
          </article>

          {/* Contato */}
          <article className="card">
            <div className="card__media-wrap">
              <Image
                src={imgContato}
                alt="Fale com a APECC"
                fill
                sizes="(max-width: 980px) 100vw, 33vw"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="card__body">
              <h3 className="card__title">Contato</h3>
              <p className="card__text">
                Fale conosco para parcerias, informações institucionais ou atendimento.
              </p>
              <a href="/contato" className="card__link">Fale com a APECC</a>
            </div>
          </article>
        </div>
      </section>

      {/* Seção textual (exemplo) */}
      <section className="sobre">
        <div className="container">
          <h2>Sobre a APECC</h2>
          <p>
            A APECC desenvolve projetos com foco em impacto social, transparência e
            fortalecimento das políticas públicas por meio da participação cidadã.
          </p>
        </div>
      </section>
    </>
  );
}
