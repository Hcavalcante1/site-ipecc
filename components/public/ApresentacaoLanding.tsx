import Link from "next/link";
import Image from "next/image";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import ApresentacaoCta from "@/components/public/ApresentacaoCta";
import {
  FALLBACK_NUMEROS,
  MODULOS_PORTAL,
  PASSOS,
  PROJETOS_DESTAQUE,
  PUBLICOS,
} from "@/lib/landing/content";
import styles from "./apresentacao-landing.module.css";

type Numero = { valor: string; descricao: string };

export default async function ApresentacaoLanding() {
  const [
    { data: heroHome },
    { data: introProjetos },
    { data: eixosData },
    { data: numerosBlock },
    { count: editaisAbertos },
  ] = await Promise.all([
    supabase
      .from("paginas_conteudo")
      .select("titulo, texto")
      .eq("pagina_slug", "home")
      .eq("bloco", "hero")
      .maybeSingle(),
    supabase
      .from("paginas_conteudo")
      .select("titulo, texto")
      .eq("pagina_slug", "projetos")
      .eq("bloco", "introducao")
      .maybeSingle(),
    supabase
      .from("paginas_eixos")
      .select("titulo, texto, imagem_url")
      .eq("pagina_slug", "projetos")
      .eq("bloco", "eixos")
      .order("ordem", { ascending: true }),
    supabase
      .from("paginas_conteudo")
      .select("extra")
      .eq("pagina_slug", "projetos")
      .eq("bloco", "numeros")
      .maybeSingle(),
    supabase
      .from("editais")
      .select("*", { count: "exact", head: true })
      .eq("status", "aberto"),
  ]);

  const heroTitulo =
    heroHome?.titulo?.trim() || "Educação, Cultura e Cidadania";
  const heroTexto =
    heroHome?.texto?.split("\n").filter(Boolean)[0]?.trim() ||
    "Projetos de impacto social, parcerias públicas e transparência ativa no Estado de São Paulo.";

  const introTexto =
    introProjetos?.texto?.trim() ||
    "O IPECC estrutura iniciativas em eixos complementares que se adaptam à realidade de cada território.";

  const eixos = eixosData?.length ? eixosData : null;

  let numeros: Numero[] = FALLBACK_NUMEROS;
  if (numerosBlock?.extra) {
    const raw =
      typeof numerosBlock.extra === "string"
        ? JSON.parse(numerosBlock.extra)
        : numerosBlock.extra;
    if (Array.isArray(raw) && raw.length >= 4) {
      numeros = raw.slice(0, 4).map((n: Numero) => ({
        valor: String(n.valor ?? ""),
        descricao: String(n.descricao ?? ""),
      }));
    }
  }

  const qtdEditais = editaisAbertos ?? 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: "Instituto IPECC",
    description: heroTexto,
    url: "https://www.ipecc.org.br/",
    areaServed: "São Paulo, BR",
    knowsAbout: [
      "educação",
      "cultura",
      "cidadania",
      "projetos sociais",
      "transparência",
    ],
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden />
              Instituto IPECC · São Paulo
            </span>
            <h1 className={styles.heroTitle}>
              {heroTitulo}
              <span className={styles.heroTitleSub}>
                Parcerias, editais e projetos de impacto social
              </span>
            </h1>
            <p className={styles.heroLead}>{heroTexto}</p>
            <p className={styles.heroPitch}>
              Conectamos <strong>projetos</strong>, <strong>editais</strong>,{" "}
              <strong>propostas documentais</strong> e{" "}
              <strong>transparência</strong> — para OSCs, poder público e
              parceiros institucionais.
            </p>
            <ApresentacaoCta variant="hero" />
          </div>

          <aside className={styles.heroPanel}>
            <p className={styles.heroPanelTitle}>Por que parceiros escolhem o IPECC</p>
            <ul className={styles.heroPanelList}>
              <li>Programas: Valer Mais, oficinas, cultura e parcerias</li>
              <li>Propostas online com checklist de habilitação</li>
              <li>Editais com documentação e status publicados</li>
              <li>Transparência e prestação de contas no portal</li>
            </ul>
            {qtdEditais > 0 && (
              <p className={styles.heroPanelBadge}>
                {qtdEditais} edital{qtdEditais > 1 ? "ais" : ""} aberto
                {qtdEditais > 1 ? "s" : ""} agora
              </p>
            )}
          </aside>
        </div>
      </header>

      <section className={styles.portalBridge} aria-label="Página Início">
        <div className={styles.container}>
          <div className={styles.portalBridgeInner}>
            <div className={styles.portalBridgeCopy}>
              <span className={styles.kicker}>Conteúdo editorial</span>
              <h2 className={styles.portalBridgeTitle}>
                Notícias, eventos e destaques do IPECC
              </h2>
              <p className={styles.portalBridgeText}>
                A vitrine com cards, últimas notícias e agenda — acesse pelo menu
                Início.
              </p>
            </div>
            <Link href="/inicio" className={styles.portalBridgeBtn}>
              Ir para Início
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.leadBand} aria-label="Chamada para ação">
        <div className={styles.container}>
          <div className={styles.leadBandInner}>
            <div>
              <h2 className={styles.leadBandTitle}>
                Pronto para propor uma parceria ou participar de um edital?
              </h2>
              <p className={styles.leadBandText}>
                Fale com a equipe ou envie sua proposta pelo portal de
                propostas.
              </p>
            </div>
            <ApresentacaoCta variant="band" />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <span className={styles.kicker}>Público-alvo</span>
            <h2 className={styles.sectionTitle}>
              Feito para quem precisa de clareza e resultado
            </h2>
          </header>
          <div className={styles.publicos}>
            {PUBLICOS.map((p) => (
              <article key={p.titulo} className={styles.publico}>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <span className={styles.kicker}>Escopo do portal</span>
            <h2 className={styles.sectionTitle}>O que o site IPECC oferece</h2>
            <p className={styles.sectionLead}>
              Ferramenta de relacionamento, compliance e operação — além da
              vitrine institucional com notícias e eventos.
            </p>
          </header>
          <div className={styles.modulos}>
            {MODULOS_PORTAL.map((m) => (
              <article key={m.href} className={styles.modulo}>
                <h3>{m.titulo}</h3>
                <p>{m.desc}</p>
                <Link href={m.href} className={styles.moduloLink}>
                  {m.cta} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <span className={styles.kicker}>Portfólio</span>
            <h2 className={styles.sectionTitle}>Projetos em execução</h2>
            <p className={styles.sectionLead}>{introTexto}</p>
          </header>

          {eixos && eixos.length > 0 && (
            <div className={styles.eixosRow}>
              {eixos.slice(0, 4).map((eixo, i) => (
                <div key={i} className={styles.eixoChip}>
                  <strong>{eixo.titulo}</strong>
                  <span>{eixo.texto}</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.projetosGrid}>
            {PROJETOS_DESTAQUE.map((p) => (
              <Link key={p.slug} href={p.href} className={styles.projetoCard}>
                <div className={styles.projetoMedia}>
                  <Image
                    src={p.imagem}
                    alt={p.titulo}
                    width={400}
                    height={260}
                  />
                </div>
                <div className={styles.projetoBody}>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                  <span className={styles.projetoLink}>Conhecer o programa →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <span className={styles.kicker}>Jornada do parceiro</span>
            <h2 className={styles.sectionTitle}>Como avançar em três passos</h2>
          </header>
          <div className={styles.passos}>
            {PASSOS.map((s) => (
              <article key={s.n} className={styles.passo}>
                <span className={styles.passoNum}>{s.n}</span>
                <h3>{s.titulo}</h3>
                <p>{s.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.stats} aria-label="Indicadores">
        <div className={styles.container}>
          <h2 className={styles.statsTitle}>Impacto que sustenta novas parcerias</h2>
          <div className={styles.statsGrid}>
            {numeros.map((n) => (
              <div key={n.descricao} className={styles.stat}>
                <strong>{n.valor}</strong>
                <span>{n.descricao}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <span className={styles.kicker}>Dúvidas frequentes</span>
            <h2 className={styles.sectionTitle}>Respostas rápidas</h2>
          </header>
          <dl className={styles.faq}>
            <div>
              <dt>Onde envio proposta para parceria?</dt>
              <dd>
                Em <Link href="/propostas">Propostas</Link>, com formulário por
                etapas e checklist documental.
              </dd>
            </div>
            <div>
              <dt>Como acompanho editais abertos?</dt>
              <dd>
                Em <Link href="/editais">Editais</Link>, com status e documentos
                oficiais.
              </dd>
            </div>
            <div>
              <dt>Onde vejo notícias e destaques?</dt>
              <dd>
                Na página <Link href="/inicio">Início</Link> — notícias,
                eventos e cards em destaque.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.ctaFinal}>
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <span className={styles.kicker}>Próximo passo</span>
            <h2>Explore o ecossistema IPECC</h2>
            <p>
              Projetos, transparência, editais e canais de contato com o IPECC.
            </p>
            <ApresentacaoCta variant="final" />
          </div>
        </div>
      </section>
    </div>
  );
}
