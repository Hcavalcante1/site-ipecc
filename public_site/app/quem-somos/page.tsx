// app/quem-somos/page.tsx

export default function QuemSomosPage() {
  return (
    <>
      {/* Tarja degradê que rola com o conteúdo (segue seu padrão visual) */}
      <section className="hero-rolling" aria-label="Apresentação APECC">
        <div className="hero-rolling__inner">
          <h1 className="hero__title">Quem Somos</h1>
          <p className="hero__text">
            A APECC — Associação Paulista de Educação, Cultura e Cidadania —
            desenvolve projetos educativos, culturais e sociais que fortalecem comunidades,
            ampliam o acesso a oportunidades e inspiram a cidadania ativa.
          </p>
        </div>
      </section>

      {/* Bloco principal — texto institucional */}
      <section className="sobre" aria-labelledby="titulo-sobre">
        <div className="container">
          <h2 id="titulo-sobre">Educação, Cultura e Cidadania como caminho de transformação</h2>
          <p>
            Somos uma organização da sociedade civil que acredita no poder das ações coletivas
            para transformar realidades. Atuamos como elo entre o poder público, instituições
            parceiras e a sociedade civil, articulando projetos de impacto social que unem
            educação, arte, cultura e participação social.
          </p>
          <p>
            Nosso propósito é tornar a cidadania uma experiência viva e acessível, com iniciativas
            que capacitam pessoas, fortalecem redes locais e promovem desenvolvimento humano
            em todas as suas dimensões.
          </p>
        </div>
      </section>

      {/* Missão, Visão e Valores — lado a lado em telas largas */}
      <section className="sobre" aria-label="Missão, Visão e Valores">
        <div className="container">
          <div className="destaques__grid">
            <article>
              <h3>Missão</h3>
              <p>
                Promover o desenvolvimento humano por meio da educação, da cultura e da cidadania,
                criando oportunidades de aprendizagem, expressão e convivência que fortalecem o
                tecido social e incentivam o engajamento comunitário.
              </p>
            </article>

            <article>
              <h3>Visão</h3>
              <p>
                Ser referência no estado de São Paulo como instituição parceira do poder público e
                da sociedade civil, reconhecida pela qualidade e pelo impacto de seus projetos,
                pela gestão transparente e pelo compromisso com a transformação social sustentável.
              </p>
            </article>

            <article>
              <h3>Valores</h3>
              <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                <li><strong>Educação como direito:</strong> base da autonomia e da igualdade de oportunidades.</li>
                <li><strong>Cultura como expressão:</strong> diversidade como instrumento de inclusão e identidade.</li>
                <li><strong>Cidadania ativa:</strong> participação social e fortalecimento das comunidades.</li>
                <li><strong>Transparência e ética:</strong> responsabilidade pública e gestão íntegra.</li>
                <li><strong>Parceria e diálogo:</strong> pontes entre governo, sociedade civil e iniciativa privada.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* Eixos de atuação */}
      <section className="sobre" aria-labelledby="titulo-atuacao">
        <div className="container">
          <h2 id="titulo-atuacao">Nossa atuação</h2>
          <p>
            A APECC desenvolve ações em diferentes frentes, sempre com foco em educação,
            cultura e cidadania. Nossos eixos articulam atividades formativas, produção
            cultural e gestão de projetos com resultados mensuráveis e duradouros.
          </p>

          <div className="cards__grid" style={{ marginTop: 16 }}>
            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Formação educacional e cidadã</h3>
                <p className="card__text">
                  Oficinas, cursos e projetos em escolas públicas e espaços comunitários,
                  com metodologias participativas, mediação cultural e foco em competências
                  socioemocionais.
                </p>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Cultura e arte para todos</h3>
                <p className="card__text">
                  Circuitos culturais, mostras, festivais e eventos de valorização da
                  diversidade artística, ampliando o acesso e estimulando a criação local.
                </p>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Gestão e apoio institucional</h3>
                <p className="card__text">
                  Elaboração, execução e monitoramento de projetos sociais e culturais em
                  parceria com órgãos públicos e OSCs, com indicadores, prestação de contas
                  e compromisso com resultados.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Compromissos e convite */}
      <section className="sobre-cta" aria-label="Compromissos e convite">
        <div className="container sobre-cta__grid">
          <div className="sobre">
            <h2>Compromisso com impacto e transparência</h2>
            <p>
              Prestamos contas de nossas ações, resultados e investimentos, mantendo um
              relacionamento ético e responsável com a sociedade e com nossos parceiros.
              Trabalhamos com indicadores, evidências e melhoria contínua das metodologias.
            </p>
            <p>
              A cada projeto, reafirmamos a certeza de que educar, inspirar e transformar
              são os pilares para construir um futuro mais justo, plural e solidário.
            </p>
          </div>

          <div className="cta-green__inner">
            <h3>Junte-se a nós</h3>
            <p>
              A transformação social é fruto da colaboração. Se você é educador, artista,
              gestor público, instituição parceira ou cidadão comprometido com o futuro,
              queremos caminhar com você.
            </p>
            <a href="/contato" className="btn-cta" aria-label="Ir para a página de contato">
              Fale com a APECC
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
