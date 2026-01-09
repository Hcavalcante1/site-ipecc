// app/projetos/page.tsx

export default function ProjetosPage() {
  return (
    <>
      {/* Tarja degradê que rola com o conteúdo */}
      <section className="hero-rolling" aria-label="Projetos APECC">
        <div className="hero-rolling__inner">
          <h1 className="hero__title">Projetos</h1>
          <p className="hero__text">
            Nossos projetos unem educação, cultura e cidadania para fortalecer redes locais,
            ampliar o acesso a oportunidades e gerar impacto social duradouro.
          </p>
        </div>
      </section>

      {/* Introdução */}
      <section className="sobre" aria-labelledby="intro-projetos">
        <div className="container">
          <h2 id="intro-projetos">Como atuamos</h2>
          <p>
            A APECC estrutura iniciativas em eixos complementares que se adaptam à realidade
            de cada território. Trabalhamos com metodologias participativas, processos de
            formação, produção cultural e acompanhamento de indicadores para garantir
            resultados consistentes em políticas públicas e no cotidiano das comunidades.
          </p>
        </div>
      </section>

      {/* Eixos temáticos (cards sem imagem, seguindo seu padrão) */}
      <section className="sobre" aria-label="Eixos temáticos">
        <div className="container">
          <div className="cards__grid">
            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Educação e Cidadania</h3>
                <p className="card__text">
                  Oficinas, trilhas formativas e projetos em escolas e equipamentos públicos,
                  com ênfase em competências socioemocionais, participação juvenil e mediação
                  de conflitos, articulando família, escola e território.
                </p>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Cultura e Circuitos Artísticos</h3>
                <p className="card__text">
                  Mostras, festivais, circulação de espetáculos, intervenções urbanas e ações
                  de valorização da produção local. Acesso e fruição cultural com foco na
                  diversidade e na democratização de linguagens.
                </p>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Comunidade e Desenvolvimento Social</h3>
                <p className="card__text">
                  Projetos comunitários, mobilização de redes, capacitação de lideranças,
                  voluntariado e articulação de parcerias público-comunitárias com foco
                  em resultados mensuráveis e prestação de contas transparente.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Destaques com imagem (usa as imagens que você já possui em /public/media) */}
      <section className="destaques" aria-labelledby="destaques-projetos">
        <div className="container">
          <h2 id="destaques-projetos">Destaques</h2>
          <div className="destaques__grid">
            <article>
              <img src="/media/evento-cultural.jpg" alt="Festival Cultural APECC" />
              <h3>Festival Cultural APECC</h3>
              <p>
                Programação com música, dança, artes visuais e oficinas abertas, realizada
                em parceria com escolas e equipamentos culturais do município.
              </p>
            </article>

            <article>
              <img src="/media/oficina-educacao.jpg" alt="Trilhas de Educação Cidadã" />
              <h3>Trilhas de Educação Cidadã</h3>
              <p>
                Sequências formativas em temas como direitos humanos, meio ambiente,
                protagonismo juvenil e cultura de paz, com avaliação por indicadores.
              </p>
            </article>

            <article>
              <img src="/media/acao-social.jpg" alt="Ação Social Itinerante" />
              <h3>Ação Social Itinerante</h3>
              <p>
                Atendimentos e oficinas integradas em bairros periféricos, mobilizando
                voluntários e parceiros locais para respostas rápidas e efetivas.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Metodologia (texto + lista) */}
      <section className="sobre" aria-labelledby="metodologia">
        <div className="container">
          <h2 id="metodologia">Metodologia</h2>
          <p>
            Nossos projetos seguem um ciclo simples e eficiente: escuta territorial,
            desenho colaborativo, implantação com monitoramento contínuo e avaliação de
            resultados com transparência pública.
          </p>
          <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
            <li><strong>Diagnóstico:</strong> mapeamento de demandas e atores locais.</li>
            <li><strong>Co-criação:</strong> planejamento participativo com gestores e comunidade.</li>
            <li><strong>Execução:</strong> cronogramas claros, equipe qualificada e metas objetivas.</li>
            <li><strong>Monitoramento:</strong> indicadores de processo, produto e resultado.</li>
            <li><strong>Prestação de contas:</strong> relatórios técnicos, financeiros e publicação em transparência.</li>
          </ul>
        </div>
      </section>

      {/* Resultados em números (usa sua seção/estilo .numeros) */}
      <section className="numeros" aria-labelledby="resultados">
        <div className="container">
          <h2 id="resultados">Resultados</h2>
          <div className="numeros__grid">
            <div><strong>+120</strong><span>Projetos Realizados</span></div>
            <div><strong>35</strong><span>Municípios Atendidos</span></div>
            <div><strong>50.000+</strong><span>Pessoas Impactadas</span></div>
            <div><strong>300+</strong><span>Parceiros Envolvidos</span></div>
          </div>
        </div>
      </section>

      {/* CTA final (aproveita o seu bloco verde) */}
      <section className="sobre-cta" aria-label="Chamada para contato">
        <div className="container sobre-cta__grid">
          <div className="sobre">
            <h2>Parcerias e editais</h2>
            <p>
              Atuamos com Termo de Colaboração, convênios, patrocínios e cooperações técnicas.
              Se a sua instituição busca um parceiro qualificado para execução de políticas
              públicas e projetos socioculturais, fale com a APECC.
            </p>
          </div>
          <div className="cta-green__inner">
            <h3>Vamos construir juntos</h3>
            <p>Apresente sua demanda, edital ou proposta de parceria.</p>
            <a href="/contato" className="btn-cta" aria-label="Ir para a página de contato">
              Fale com a APECC
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
