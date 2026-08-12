import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Exclusão de Dados | IPECC",
  description:
    "Instruções para solicitação de exclusão de dados pessoais relacionados ao IPECC BOT.",
  alternates: {
    canonical: "/exclusao-de-dados",
  },
};

const paragrafosIntroducao = [
  "O Instituto Paulista de Esporte, Cultura e Cidadania – IPECC respeita a privacidade e a proteção dos dados pessoais dos usuários de seus canais digitais.",
  "Os usuários que interagirem com o IPECC BOT, inclusive por meio de serviços disponibilizados pelas plataformas da Meta, poderão solicitar a exclusão dos dados pessoais associados à sua interação com o aplicativo.",
];

const paragrafosSolicitacao = [
  "A solicitação poderá ser realizada por meio dos canais oficiais de contato do IPECC, informando no pedido que se trata de uma “Solicitação de Exclusão de Dados – IPECC BOT”.",
  "Para permitir a localização correta das informações, poderá ser necessário fornecer dados suficientes para identificação do solicitante e da interação relacionada ao pedido.",
];

const paragrafosTratamento = [
  "Após o recebimento, o IPECC analisará a solicitação e adotará as providências aplicáveis para exclusão ou anonimização dos dados pessoais, observados os prazos, hipóteses e obrigações legais de conservação estabelecidos pela legislação aplicável.",
  "Determinadas informações poderão ser mantidas quando sua conservação for necessária para cumprimento de obrigação legal ou regulatória, exercício regular de direitos ou demais hipóteses autorizadas pela Lei nº 13.709/2018 – Lei Geral de Proteção de Dados Pessoais (LGPD).",
];

function Section({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <section className="public-detail-card__section">
      <h2 className="public-detail-card__section-title">{title}</h2>
      <div className="public-detail-card__text">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export default function ExclusaoDeDadosPage() {
  return (
    <section className="public-content public-content--detail">
      <div className="public-content__inner">
        <article className="public-detail-card">
          <div className="public-detail-card__body">
            <p className="public-detail-card__eyebrow">Instituto Paulista de Esporte, Cultura e Cidadania – IPECC</p>
            <h1 className="public-detail-card__title">Exclusão de Dados – IPECC BOT</h1>
            <p className="public-detail-card__lead">
              Página pública para solicitação de exclusão de dados pessoais relacionados à interação com o IPECC BOT.
            </p>

            <div className="public-detail-card__text">
              {paragrafosIntroducao.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <Section title="Como solicitar a exclusão" paragraphs={paragrafosSolicitacao} />
            <Section title="Tratamento da solicitação" paragraphs={paragrafosTratamento} />

            <section className="public-detail-card__section">
              <h2 className="public-detail-card__section-title">Controlador dos dados</h2>
              <dl className="public-detail-card__facts">
                <div className="public-detail-card__fact">
                  <dt>Controlador</dt>
                  <dd>Instituto Paulista de Esporte, Cultura e Cidadania – IPECC</dd>
                </div>
                <div className="public-detail-card__fact">
                  <dt>Site institucional</dt>
                  <dd>
                    <a className="card__link" href="https://www.ipecc.org.br/">
                      https://www.ipecc.org.br/
                    </a>
                  </dd>
                </div>
                <div className="public-detail-card__fact">
                  <dt>Última atualização</dt>
                  <dd>11 de agosto de 2026.</dd>
                </div>
              </dl>
            </section>

            <p className="public-detail-card__notice public-detail-card__notice--info">
              Esta página é acessível publicamente, sem login e sem autenticação, para atender ao requisito de exclusão de dados do IPECC BOT.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
