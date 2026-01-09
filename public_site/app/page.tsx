// app/page.tsx

export default function HomePage() {
  return (
    <>
      {/* ===== TARJA AZUL DEGRADÊ (rola com o conteúdo) ===== */}
      <section className="hero-rolling">
        <div className="hero-rolling__inner">
          <h1 className="hero__title">Educação, Cultura e Cidadania</h1>
          <p className="hero__text">
            Promovemos projetos e ações para fortalecer a educação, a cultura e a cidadania no Estado de São Paulo.
          </p>
          <a href="/projetos" className="btn btn--light" aria-label="Conheça nossos projetos">
            Conheça nossos projetos
          </a>
        </div>
      </section>

      {/* ===== CARDS PRINCIPAIS ===== */}
      <section className="cards">
        <div className="container cards__grid">
          {/* Projetos */}
          <article className="card">
            <div className="card__media-wrap">
              <img src="/media/projetos.jpg" alt="Projetos APECC" />
            </div>
            <div className="card__body">
              <h3 className="card__title">Projetos</h3>
              <p className="card__text">
                Conheça nossas iniciativas e resultados nas áreas de educação, cultura, cidadania e desenvolvimento social.
              </p>
              <a href="/projetos" className="card__link">Ver projetos</a>
            </div>
          </article>

          {/* Transparência */}
          <article className="card">
            <div className="card__media-wrap">
              <img src="/media/transparencia.jpg" alt="Transparência APECC" />
            </div>
            <div className="card__body">
              <h3 className="card__title">Transparência</h3>
              <p className="card__text">
                Acompanhe editais, contratos, termos de parceria e relatórios institucionais.
              </p>
              <a href="/transparencia" className="card__link">Acesso à transparência</a>
            </div>
          </article>

          {/* Contato */}
          <article className="card">
            <div className="card__media-wrap">
              <img src="/media/contato.jpg" alt="Fale com a APECC" />
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

      {/* ===== DESTAQUES ===== */}
      <section className="destaques">
        <div className="container">
          <h2>Destaques da Semana</h2>
          <div className="destaques__grid">
            <article>
              <img src="/media/evento-cultural.jpg" alt="Festival Cultural APECC" />
              <h3>Festival Cultural APECC</h3>
              <p>Apresentações artísticas, oficinas e atividades educativas em parceria com escolas e OSCs locais.</p>
              <a href="/projetos" className="btn-vermais">Saiba mais</a>
            </article>

            <article>
              <img src="/media/oficina-educacao.jpg" alt="Oficinas de Educação Cidadã" />
              <h3>Oficinas de Educação Cidadã</h3>
              <p>Capacitação de jovens e adultos com foco em cidadania, sustentabilidade e participação social.</p>
              <a href="/projetos" className="btn-vermais">Ver detalhes</a>
            </article>

            <article>
              <img src="/media/acao-social.jpg" alt="Ação Social Itinerante" />
              <h3>Ação Social Itinerante</h3>
              <p>Atendimento gratuito e oficinas integradas em bairros periféricos com apoio de voluntários e parceiros.</p>
              <a href="/projetos" className="btn-vermais">Ver ação</a>
            </article>
          </div>
        </div>
      </section>

      {/* ===== NÚMEROS (com imagem de fundo de números + degradê) ===== */}
      <section className="numeros">
        <div className="container">
          <h2>Nossos Projetos em Números</h2>
          <div className="numeros__grid">
            <div><strong>+120</strong><span>Projetos Realizados</span></div>
            <div><strong>35</strong><span>Municípios Atendidos</span></div>
            <div><strong>50.000+</strong><span>Pessoas Impactadas</span></div>
            <div><strong>300+</strong><span>Parceiros Envolvidos</span></div>
          </div>
        </div>
      </section>

      {/* ===== IMPACTO SOCIAL ===== */}
      <section className="impacto">
        <div className="container">
          <h2>Impacto Social</h2>
          <p>
            A APECC promove inclusão, cidadania e transformação social por meio de projetos culturais, educacionais e comunitários
            que fortalecem o vínculo entre sociedade civil e poder público.
          </p>
          <div className="impacto__imagem">
            <img src="/media/impacto-social.jpg" alt="Impacto social APECC" />
          </div>
        </div>
      </section>

      {/* ===== DEPOIMENTOS ===== */}
      <section className="depoimentos">
        <div className="container">
          <h2>O Impacto da APECC</h2>
          <div className="depoimentos__grid">
            <blockquote>
              “Graças à APECC, nossa escola recebeu oficinas de arte e cidadania que transformaram nossos alunos.”
              <cite>— Diretora, Escola Municipal de Suzano</cite>
            </blockquote>
            <blockquote>
              “Os projetos da APECC resgatam a autoestima e oferecem oportunidades reais nas comunidades.”
              <cite>— Coordenadora Social</cite>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ===== SOBRE + CTA VERDE FINAL (lado a lado) ===== */}
      <section className="sobre-cta">
        <div className="container sobre-cta__grid">
          <div className="sobre">
            <h2>Sobre a APECC</h2>
            <p>
              A APECC desenvolve projetos com foco em impacto social, transparência e fortalecimento das políticas públicas
              por meio da participação cidadã. Atuamos em rede com parceiros institucionais para ampliar o acesso à educação,
              à cultura e à cidadania.
            </p>
          </div>

          <div className="cta-green__inner">
            <h3>Junte-se a nós</h3>
            <p>Faça parte da nossa rede de parceiros e voluntariado. Sua colaboração pode transformar vidas e comunidades.</p>
            <a className="btn-cta" href="/contato" aria-label="Entre em contato">
              Entre em contato
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
