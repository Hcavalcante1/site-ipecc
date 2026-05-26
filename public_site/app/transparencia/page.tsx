// app/transparencia/page.tsx
import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";

function isDocumentAvailable(href: string) {
  if (!href.startsWith("/docs/")) return true;

  try {
    const filePath = path.join(process.cwd(), "public", href);
    return fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
}

function DocumentLink({
  href,
  children,
  className = "card__link",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  if (!isDocumentAvailable(href)) {
    return (
      <span className={`${className} card__link--disabled`} aria-disabled="true">
        {children} <small>(em atualização)</small>
      </span>
    );
  }

  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function TransparenciaPage() {
  return (
    <>
      {/* Tarja degradê que rola com o conteúdo */}
      <section className="hero-rolling" aria-label="Transparência APECC">
        <div className="hero-rolling__inner">
          <h1 className="hero__title">Transparência</h1>
          <p className="hero__text">
            Transparência é um compromisso permanente da APECC. Publicamos informações
            institucionais, documentos, relatórios e prestações de contas para garantir
            o controle social e o acesso público aos resultados.
          </p>
        </div>
      </section>

      {/* Compromissos e princípios */}
      <section className="sobre" aria-labelledby="compromissos">
        <div className="container">
          <h2 id="compromissos">Compromissos e princípios</h2>
          <p>
            Atuamos com ética, publicidade dos atos e responsabilidade no uso de recursos.
            Nossos processos observam a legislação vigente, boas práticas de governança e
            a participação social. Este espaço reúne os principais documentos exigidos por
            órgãos de controle e pelos instrumentos de parceria com o poder público.
          </p>
        </div>
      </section>

      {/* Documentos institucionais essenciais */}
      <section className="sobre" aria-labelledby="docs-institucionais">
        <div className="container">
          <h2 id="docs-institucionais">Documentos institucionais</h2>
          <div className="cards__grid" style={{ marginTop: 16 }}>
            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Atos constitutivos</h3>
                <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li><DocumentLink href="/docs/estatuto-social.pdf">Estatuto Social (atualizado)</DocumentLink></li>
                  <li><DocumentLink href="/docs/ata-eleicao-diretoria.pdf">Ata de Eleição e Posse da Diretoria</DocumentLink></li>
                  <li><DocumentLink href="/docs/cnpj-cartao.pdf">Cartão CNPJ</DocumentLink></li>
                </ul>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Governança e conformidade</h3>
                <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li><DocumentLink href="/docs/regimento-interno.pdf">Regimento Interno / Políticas</DocumentLink></li>
                  <li><DocumentLink href="/docs/codigo-conduta.pdf">Código de Conduta e Integridade</DocumentLink></li>
                  <li><DocumentLink href="/docs/politica-lgpd.pdf">Política de Privacidade e LGPD</DocumentLink></li>
                </ul>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Habilitações e certidões</h3>
                <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li><DocumentLink href="/docs/cnd-federal.pdf">CND Federal (RFB / PGFN)</DocumentLink></li>
                  <li><DocumentLink href="/docs/cnd-estadual.pdf">CND Estadual</DocumentLink></li>
                  <li><DocumentLink href="/docs/cnd-municipal.pdf">CND Municipal</DocumentLink></li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Termos, contratos e parcerias públicas */}
      <section className="sobre" aria-labelledby="parcerias-publicas">
        <div className="container">
          <h2 id="parcerias-publicas">Parcerias e instrumentos</h2>
          <p>
            Publicamos os instrumentos de parceria firmados com a administração pública
            (Termo de Colaboração, Convênios e Acordos), bem como seus anexos, planos de
            trabalho, metas, cronogramas e aditivos, em conformidade com a Lei 13.019/2014.
          </p>

          <div className="destaques__grid" style={{ marginTop: 16 }}>
            <article>
              <h3>Termos e convênios</h3>
              <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                <li><DocumentLink href="/docs/termo-colaboracao-001.pdf">Termo de Colaboração nº 001/2025 — Plano de Trabalho</DocumentLink></li>
                <li><DocumentLink href="/docs/aditivo-001-termo001.pdf">Aditivo nº 001 — Ampliação de Metas</DocumentLink></li>
                <li><DocumentLink href="/docs/relatorio-parcial-termo001.pdf">Relatório Parcial de Execução</DocumentLink></li>
              </ul>
            </article>

            <article>
              <h3>Chamadas e editais</h3>
              <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                <li><DocumentLink href="/docs/edital-parceria-educacao.pdf">Edital — Programa de Educação e Cidadania</DocumentLink></li>
                <li><DocumentLink href="/docs/edital-circuito-cultural.pdf">Edital — Circuito Cultural</DocumentLink></li>
                <li><DocumentLink href="/docs/resultado-selecao.pdf">Resultados de Seleção</DocumentLink></li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* Prestação de contas e relatórios */}
      <section className="sobre" aria-labelledby="prestacao-contas">
        <div className="container">
          <h2 id="prestacao-contas">Prestação de contas</h2>
          <p>
            Divulgamos relatórios técnicos e financeiros, com indicadores de processo,
            produto e resultado. A transparência inclui publicação de extratos,
            demonstrativos e pareceres quando aplicável.
          </p>

          <div className="cards__grid" style={{ marginTop: 16 }}>
            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Relatórios técnicos</h3>
                <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li><DocumentLink href="/docs/relatorio-tecnico-semestral.pdf">Relatório Técnico Semestral</DocumentLink></li>
                  <li><DocumentLink href="/docs/relatorio-atividades.pdf">Relatório de Atividades</DocumentLink></li>
                </ul>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Relatórios financeiros</h3>
                <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li><DocumentLink href="/docs/demonstrativo-receitas-despesas.pdf">Demonstrativo de Receitas e Despesas</DocumentLink></li>
                  <li><DocumentLink href="/docs/conciliacao-bancaria.pdf">Conciliação Bancária</DocumentLink></li>
                </ul>
              </div>
            </article>

            <article className="card">
              <div className="card__body">
                <h3 className="card__title">Publicações complementares</h3>
                <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                  <li><DocumentLink href="/docs/parecer-contabil.pdf">Parecer Contábil</DocumentLink></li>
                  <li><DocumentLink href="/docs/auditoria-independente.pdf">Relatório de Auditoria Independente</DocumentLink></li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* LGPD e Canal de integridade */}
      <section className="sobre-cta" aria-label="LGPD e integridade">
        <div className="container sobre-cta__grid">
          <div className="sobre">
            <h2>LGPD e integridade</h2>
            <p>
              A APECC está comprometida com a proteção de dados pessoais e com a integridade
              institucional. Para solicitações relacionadas à LGPD ou relatos de conduta,
              disponibilizamos canais específicos de atendimento com registro e retorno.
            </p>
            <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
              <li><DocumentLink href="/docs/politica-lgpd.pdf">Política de Privacidade e Proteção de Dados</DocumentLink></li>
              <li><a className="card__link" href="mailto:lgpd@apecc.org.br">Canal LGPD — lgpd@apecc.org.br</a></li>
              <li><a className="card__link" href="mailto:integridade@apecc.org.br">Canal de Integridade — integridade@apecc.org.br</a></li>
            </ul>
          </div>

          <div className="cta-green__inner">
            <h3>Acesso rápido a documentos</h3>
            <p>Baixe diretamente os principais arquivos publicados pela APECC.</p>
            <DocumentLink href="/docs/relatorio-atividades.pdf" className="btn-cta">Baixar Relatório de Atividades</DocumentLink>
          </div>
        </div>
      </section>
    </>
  );
}
