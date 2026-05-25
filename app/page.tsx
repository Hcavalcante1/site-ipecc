import { createClient } from "../lib/supabaseServer";
import { resolveMediaPath } from "@/lib/media";
import { PublicHeroRolling } from "@/components/public";
import PublicWhatsAppCtaLink from "@/components/public/PublicWhatsAppCtaLink";
import WhatsAppLeadTrigger from "@/components/public/WhatsAppLeadTrigger";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";


type Card = {
  id: string;
  titulo: string;
  texto: string;
  linkTexto: string;
  linkUrl: string;
  imagem: string;
};

type Destaque = {
  id: string;
  titulo: string;
  texto: string;
  linkTexto: string;
  linkUrl: string;
  imagem: string;
};

type NumeroAdmin = {
  id: string;
  valor: string;
  descricao: string;
};

type DepoimentoAdmin = {
  id: string;
  texto: string;
  autor: string;
};

type CtaAdmin = {
  titulo: string;
  texto: string;
  url: string;
  label: string;
};

const FALLBACK_CARDS: Card[] = [
  {
    id: "projetos",
    titulo: "Projetos",
    texto:
      "Conheça nossas iniciativas e resultados nas áreas de educação, cultura, cidadania e desenvolvimento social.",
    linkTexto: "Ver projetos",
    linkUrl: "/projetos",
    imagem: "/media/home/cards/projetos.jpg",
  },
  {
    id: "transparencia",
    titulo: "Transparência",
    texto:
      "Acompanhe editais, contratos, termos de parceria e relatórios institucionais.",
    linkTexto: "Acesso à transparência",
    linkUrl: "/transparencia",
    imagem: "/media/home/cards/transparencia.jpg",
  },
  {
    id: "contato",
    titulo: "Contato",
    texto:
      "Fale conosco para parcerias, informações institucionais ou atendimento.",
    linkTexto: "Fale com O IPECC",
    linkUrl: "/contato",
    imagem: "/media/home/cards/contato.jpg",
  },
];

const FALLBACK_DESTAQUES: Destaque[] = [
  {
    id: "festival",
    titulo: "Festival Cultural IPECC",
    texto:
      "Apresentações artísticas, oficinas e atividades educativas em parceria com escolas e OSCs locais.",
    linkTexto: "Saiba mais",
    linkUrl: "/projetos",
    imagem: "/media/home/destaques/evento-cultural.jpg",
  },
  {
    id: "oficinas",
    titulo: "Oficinas de Educação Cidadã",
    texto:
      "Capacitação de jovens e adultos com foco em cidadania, sustentabilidade e participação social.",
    linkTexto: "Ver detalhes",
    linkUrl: "/projetos",
    imagem: "/media/home/destaques/oficina-educacao.jpg",
  },
  {
    id: "acao",
    titulo: "Ação Social Itinerante",
    texto:
      "Atendimento gratuito e oficinas integradas em bairros periféricos com apoio de voluntários e parceiros.",
    linkTexto: "Ver ação",
    linkUrl: "/projetos",
    imagem: "/media/home/destaques/acao-social.jpg",
  },
];

const FALLBACK_NUMEROS: NumeroAdmin[] = [
  { id: "projetos", valor: "+120", descricao: "Projetos Realizados" },
  { id: "municipios", valor: "35", descricao: "Municípios Atendidos" },
  { id: "pessoas", valor: "50.000+", descricao: "Pessoas Impactadas" },
  { id: "parceiros", valor: "300+", descricao: "Parceiros Envolvidos" },
];

const FALLBACK_DEPOIMENTOS: DepoimentoAdmin[] = [
  {
    id: "dep1",
    texto:
      "Graças ao IPECC, nossa escola recebeu oficinas de arte e cidadania que transformaram nossos alunos.",
    autor: "Diretora, Escola Municipal de Suzano",
  },
  {
    id: "dep2",
    texto:
      "Os projetos do IPECC resgatam a autoestima e oferecem oportunidades reais nas comunidades.",
    autor: "Coordenadora Social",
  },
];

const FALLBACK_CTA: CtaAdmin = {
  titulo: "Junte-se a nós",
  texto: "Faça parte da nossa rede de parceiros e voluntariado.",
  url: "/contato",
  label: "Entre em contato",
};

export default async function HomePage() {

  const supabase = createClient(); // 🔥 COLOCA ESSA LINHA AQUI

  const { data: hero } = await supabase
    .from("paginas_conteudo")
    .select("*")
    .eq("pagina_slug", "home")
    .eq("bloco", "hero")
    .maybeSingle();

  const { data: pagina } = await supabase
    .from("paginas")
    .select("*")
    .eq("slug", "home")
    .maybeSingle();

const { data: sobre } = await supabase
  .from("paginas_conteudo")
  .select("*")
  .eq("pagina_slug", "home")
  .eq("bloco", "sobre")
  .maybeSingle();

  const { data: depoimentos } = await supabase
    .from("depoimentos")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  const { data: destaques } = await supabase
    .from("projetos_destaques")
    .select("*")
    .eq("pagina_slug", "home")
    .order("ordem", { ascending: true });

  const { data: numeros } = await supabase
    .from("projetos_resultados")
    .select("*")
    .eq("pagina_slug", "home")
    .order("ordem", { ascending: true });

  const { data: cardsBlock } = await supabase
    .from("paginas_conteudo")
    .select("extra")
    .eq("pagina_slug", "home")
    .eq("bloco", "cards_principais")
    .maybeSingle();

const { data: noticias } = await supabase
  .from("noticias")
  .select("*")
  .eq("publicado", true)
  .order("created_at", { ascending: false })
  .limit(2);

const { data: eventos } = await supabase
  .from("eventos")
  .select("*")
  .eq("publicado", true)
  .order("data_evento", { ascending: true })
  .limit(2);

  const cards: Card[] =
    (cardsBlock as any)?.extra?.cards &&
    Array.isArray((cardsBlock as any)?.extra?.cards) &&
    (cardsBlock as any)?.extra?.cards.length > 0
      ? ((cardsBlock as any)?.extra?.cards as Card[])
      : FALLBACK_CARDS;

  const { data: destaquesBlock } = await supabase
    .from("paginas_conteudo")
    .select("extra")
    .eq("pagina_slug", "home")
    .eq("bloco", "destaques")
    .maybeSingle();

  const destaquesAdmin: Destaque[] =
    (destaquesBlock as any)?.extra?.destaques &&
    Array.isArray((destaquesBlock as any)?.extra?.destaques) &&
    (destaquesBlock as any)?.extra?.destaques.length > 0
      ? ((destaquesBlock as any)?.extra?.destaques as Destaque[])
      : [];

  const destaquesRender: any[] =
    destaquesAdmin.length > 0
      ? destaquesAdmin
      : destaques && destaques.length > 0
      ? destaques
      : FALLBACK_DESTAQUES;

  const { data: impacto } = await supabase
    .from("paginas_conteudo")
    .select("*")
    .eq("pagina_slug", "home")
    .eq("bloco", "impacto")
    .maybeSingle();

  const { data: numerosBlock } = await supabase
    .from("paginas_conteudo")
    .select("extra")
    .eq("pagina_slug", "home")
    .eq("bloco", "numeros")
    .maybeSingle();

  const numerosAdmin: NumeroAdmin[] =
    (numerosBlock as any)?.extra?.numeros &&
    Array.isArray((numerosBlock as any)?.extra?.numeros) &&
    (numerosBlock as any)?.extra?.numeros.length > 0
      ? ((numerosBlock as any)?.extra?.numeros as NumeroAdmin[])
      : [];

  const numerosRender: any[] =
    numerosAdmin.length > 0
      ? numerosAdmin
      : numeros && numeros.length > 0
      ? numeros
      : FALLBACK_NUMEROS;

  const { data: depoimentosBlock } = await supabase
    .from("paginas_conteudo")
    .select("extra")
    .eq("pagina_slug", "home")
    .eq("bloco", "depoimentos_home")
    .maybeSingle();

  const depoimentosAdmin: DepoimentoAdmin[] =
    (depoimentosBlock as any)?.extra?.depoimentos &&
    Array.isArray((depoimentosBlock as any)?.extra?.depoimentos) &&
    (depoimentosBlock as any)?.extra?.depoimentos.length > 0
      ? ((depoimentosBlock as any)?.extra?.depoimentos as DepoimentoAdmin[])
      : [];

  const depoimentosRender: any[] =
    depoimentosAdmin.length > 0
      ? depoimentosAdmin
      : depoimentos && depoimentos.length > 0
      ? depoimentos
      : FALLBACK_DEPOIMENTOS;

  const { data: ctaBlock } = await supabase
    .from("paginas_conteudo")
    .select("extra")
    .eq("pagina_slug", "home")
    .eq("bloco", "cta_final")
    .maybeSingle();

  const ctaAdmin: CtaAdmin =
    (ctaBlock as any)?.extra?.cta && typeof (ctaBlock as any)?.extra?.cta === "object"
      ? ((ctaBlock as any)?.extra?.cta as CtaAdmin)
      : (pagina?.cta as CtaAdmin) || FALLBACK_CTA;

  const partesHero =
    typeof hero?.texto === "string"
      ? hero.texto.split("\n").filter(Boolean)
      : [];

  logPublicFetch({
    page: "/",
    table: "paginas_conteudo+home",
    count: cards.length + destaquesRender.length,
  });

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/home/hero.webp"
        title={hero?.titulo || "Educação, Cultura e Cidadania"}
        text={
          partesHero[0] ||
          "Promovemos projetos e ações para fortalecer a educação, a cultura e a cidadania no Estado de São Paulo."
        }
        ariaLabel="Instituto IPECC"
      >
        <a href={partesHero[2] || "/projetos"} className="btn btn--light">
          {partesHero[1] || "Conheça nossos projetos"}
        </a>
      </PublicHeroRolling>

      {/* ===== CARDS ===== */}
      <section className="cards">
        <div className="container cards__grid">
          {cards.slice(0, 3).map((card) => (
            <article className="card" key={card.id}>
              <div className="card__media-wrap">
                <img
                  src={card.imagem || "/media/home/cards/projetos.jpg"}
                  alt={`${card.titulo} IPECC`}
                />
              </div>
              <div className="card__body">
                <h3 className="card__title">{card.titulo}</h3>
                <p className="card__text">{card.texto}</p>
                <PublicWhatsAppCtaLink
                  href={card.linkUrl}
                  className="card__link"
                >
                  {card.linkTexto}
                </PublicWhatsAppCtaLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== DESTAQUES ===== */}
      <section className="destaques">
        <div className="container">
          <h2>Destaques da Semana</h2>
          <div className="destaques__grid">
            {destaquesRender.map((item: any) => (
              <article key={item.id}>
                <img
                  src={resolveMediaPath(item.imagem || item.imagem_url) || "/media/home/destaques/evento-cultural.jpg"}
                  alt={item.titulo}
                />
                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
                <a href={item.linkUrl || "/projetos"} className="btn-vermais">
                  {item.linkTexto || "Saiba mais"}
                </a>
              </article>
            ))}
          </div>
        </div>
</section>

{/* ===== NOTÍCIAS + EVENTOS ===== */}
<section style={{ padding: "48px 20px" }}>
  <div style={{ maxWidth: 1000, margin: "0 auto" }}>

    {/* NOTÍCIAS */}
    <h2 style={{ marginBottom: 20 }}>Últimas notícias</h2>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 20,
        marginBottom: 28,
      }}
    >
      {noticias && noticias.length > 0 ? (
        noticias.map((n: any) => (
          <a
            key={n.id}
            href={`/noticias/${n.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ aspectRatio: "16 / 9", overflow: "hidden" }}>
              <img
                src={resolveMediaPath(n.imagem_url) || "/media/home/cards/projetos.jpg"}
                alt={n.titulo}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            <div style={{ padding: 12 }}>
              <h4>{n.titulo}</h4>
            </div>
          </a>
        ))
      ) : (
        <p>Nenhuma notícia disponível.</p>
      )}
    </div>

    {/* EVENTOS */}
    <h2 style={{ marginBottom: 20 }}>Próximos eventos</h2>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 16,
 	marginTop: 16,
      }}
    >
      {eventos && eventos.length > 0 ? (
        eventos.map((e: any) => (
          <div
            key={e.id}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 14,
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
           <h4
  style={{
    marginBottom: 8,
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.3,
  }}
>
  {e.titulo}
</h4>

            <p style={{ fontSize: 17, opacity: 0.7 }}>
              📅{" "}
              {e.data_evento
                ? new Date(e.data_evento).toLocaleDateString("pt-BR")
                : ""}
            </p>

            {/* ✅ NOVO: HORÁRIO */}
            {e.horario && (
              <p style={{ fontSize: 17 }}>
                ⏰ {e.horario}
              </p>
            )}

            <p style={{ fontSize: 17 }}>
              📍{" "}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  e.local || ""
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                {e.local || "Local não informado"}
              </a>
            </p>

            {/* ✅ NOVO: WHATSAPP */}
            {e.whatsapp && (
              <WhatsAppLeadTrigger
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: 17,
                  color: "#16a34a",
                  textDecoration: "none",
                  background: "none",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                💬 Falar no WhatsApp
              </WhatsAppLeadTrigger>
            )}
          </div>
        ))
      ) : (
        <p>Nenhum evento disponível.</p>
      )}
    </div>

  </div>
</section>

      {/* ===== NÚMEROS DINÂMICOS ===== */}
      <section className="numeros">
        <div className="container">
          <h2>Nossos Projetos em Números</h2>
          <div className="numeros__grid">
            {numerosRender && numerosRender.length > 0 ? (
              numerosRender.map((item: any) => (
                <div key={item.id}>
                  <strong>{item.valor}</strong>
                  <span>{item.rotulo || item.descricao}</span>
                </div>
              ))
            ) : (
              <>
                <div>
                  <strong>+120</strong>
                  <span>Projetos Realizados</span>
                </div>
                <div>
                  <strong>35</strong>
                  <span>Municípios Atendidos</span>
                </div>
                <div>
                  <strong>50.000+</strong>
                  <span>Pessoas Impactadas</span>
                </div>
                <div>
                  <strong>300+</strong>
                  <span>Parceiros Envolvidos</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== IMPACTO SOCIAL ===== */}
      <section className="impacto">
        <div className="container">
          <h2>{impacto?.titulo || "Impacto Social"}</h2>
          <p>
            {impacto?.texto ||
              pagina?.compromissos_texto ||
              "O IPECC promove inclusão, cidadania e transformação social por meio de projetos culturais, educacionais e comunitários que fortalecem o vínculo entre sociedade civil e poder público."}
          </p>
          <div className="impacto__imagem">
            <img
              src={resolveMediaPath(impacto?.imagem_url) || "/media/home/impacto/impacto-social.jpg"}
              alt="Impacto social IPECC"
            />
          </div>
        </div>
      </section>

      {/* ===== DEPOIMENTOS ===== */}
      <section className="depoimentos">
        <div className="container">
          <h2>O Impacto do IPECC</h2>
          <div className="depoimentos__grid">
            {depoimentosRender && depoimentosRender.length > 0 ? (
              depoimentosRender.map((dep: any) => (
                <blockquote key={dep.id}>
                  “{dep.texto}”
                  <cite>— {dep.autor}</cite>
                </blockquote>
              ))
            ) : (
              <>
                <blockquote>
                  “Graças ao IPECC, nossa escola recebeu oficinas de arte e
                  cidadania que transformaram nossos alunos.”
                  <cite>— Diretora, Escola Municipal de Suzano</cite>
                </blockquote>
                <blockquote>
                  “Os projetos do IPECC resgatam a autoestima e oferecem
                  oportunidades reais nas comunidades.”
                  <cite>— Coordenadora Social</cite>
                </blockquote>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== SOBRE + CTA FINAL ===== */}
  ...
      {/* ===== SOBRE + CTA FINAL ===== */}
      
      {/* ===== SOBRE + CTA FINAL ===== */}
      <section className="sobre-cta">
        <div className="container sobre-cta__grid">
          <div className="sobre">
            <h2>Sobre o IPECC </h2>

            {/* 🔥 CORREÇÃO REAL */}
            <div>
              {(sobre?.texto || "")
                .split("\n")
                .filter((linha: string) => linha.trim() !== "")
                .map((linha: string, i: number) => (
                  <p key={i}>{linha}</p>
                ))}
            </div>

          </div>

          <div className="cta-green__inner">
            <h3>{ctaAdmin?.titulo || FALLBACK_CTA.titulo}</h3>
            <p>{ctaAdmin?.texto || FALLBACK_CTA.texto}</p>
            <PublicWhatsAppCtaLink
              className="btn-cta"
              href={ctaAdmin?.url || FALLBACK_CTA.url}
            >
              {ctaAdmin?.label || FALLBACK_CTA.label}
            </PublicWhatsAppCtaLink>
          </div>
        </div>
      </section>


...
    </>
  );
}

