import Link from "next/link";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { PublicHeroRolling, PublicPageContent } from "@/components/public";
import PublicWhatsAppHelpLine from "@/components/public/PublicWhatsAppHelpLine";
import { resolveEditalDownloadUrl } from "@/lib/editais/download";
import {
  buildTimelinePublica,
  descricaoDiferenteDoTitulo,
  formatDateEdital,
  getDocumentoPublicoDownloadUrl,
  getFaseAtualPublica,
  getMensagemEnvioProposta,
  labelFaseEdital,
  labelTipoDocumentoEdital,
  normalizarTextoEdital,
  podeEnviarProposta,
  resumoPeriodoRecebimento,
  resumoStatusPublico,
  type DocumentoPublicoEdital,
  type EditalPublicoDetalhe,
} from "@/lib/editais/publicDetail";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: { id: string };
};

function renderParagrafos(texto: string) {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha, index) => <p key={index}>{linha}</p>);
}

export default async function EditalDetalhePage({ params }: Props) {
  const [{ data: edital, error }, { data: documentosData, error: docsError }] =
    await Promise.all([
      supabase
        .from("editais")
        .select(
          "id, titulo, descricao, tipo, periodo, periodo_envio, status, arquivo_pdf, fase_atual, publicado_em, recebimento_inicio, recebimento_fim, created_at"
        )
        .eq("id", params.id)
        .maybeSingle(),
      supabase
        .from("documentos_publicos")
        .select(
          "id, edital_id, tipo, fase, titulo, descricao, arquivo_url, publicado, publicado_em, created_at"
        )
        .eq("edital_id", params.id)
        .eq("publicado", true)
        .order("publicado_em", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);

  logPublicFetch({
    page: `/editais/${params.id}`,
    table: "editais+documentos_publicos",
    count: (edital ? 1 : 0) + (documentosData?.length ?? 0),
    error: error?.message || docsError?.message,
  });

  if (!edital) {
    return (
      <>
        <PublicHeroRolling
          bgImage="/media/heroes/editais/hero.webp"
          title="Editais"
          text="Chamamentos públicos, editais e oportunidades de parceria."
        />
        <PublicPageContent>
          <h1 className="public-article__title">Edital não encontrado</h1>
          <p className="public-page-lead">
            O edital solicitado não existe ou não está mais disponível.
          </p>
          <Link href="/editais" className="public-detail-card__back">
            ← Voltar para editais
          </Link>
        </PublicPageContent>
      </>
    );
  }

  const registro = edital as EditalPublicoDetalhe;
  const documentos = (documentosData || []) as DocumentoPublicoEdital[];
  const titulo = normalizarTextoEdital(registro.titulo);
  const descricao = normalizarTextoEdital(registro.descricao);
  const exibirDescricao = descricaoDiferenteDoTitulo(titulo, descricao);
  const descricaoMultilinha = exibirDescricao && descricao.includes("\n");
  const downloadUrl = resolveEditalDownloadUrl(registro.arquivo_pdf);
  const faseAtual = getFaseAtualPublica(registro);
  const mensagemProposta = getMensagemEnvioProposta(registro);
  const timeline = buildTimelinePublica(registro, documentos);
  const dataPublicacao =
    formatDateEdital(registro.publicado_em) ||
    formatDateEdital(registro.created_at);
  const documentosSemFase = documentos.filter(
    (doc) => !normalizarTextoEdital(doc.fase)
  );

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/editais/hero.webp"
        title="Editais"
        text="Chamamentos públicos, editais e oportunidades de parceria."
      />

      <PublicWhatsAppHelpLine
        assunto="editais"
        intro="Precisa de orientação sobre este edital?"
      />

      <PublicPageContent className="public-content--detail">
        <article className="public-detail-card">
          <div className="public-detail-card__body">
            <header className="public-detail-card__header">
              <p className="public-detail-card__eyebrow">
                {registro.tipo || "Chamamento público"}
              </p>
              <h2 className="public-detail-card__title">{titulo}</h2>

              {exibirDescricao && descricaoMultilinha && (
                <div className="public-detail-card__text">
                  {renderParagrafos(descricao)}
                </div>
              )}

              {exibirDescricao && !descricaoMultilinha && (
                <p className="public-detail-card__lead">{descricao}</p>
              )}
            </header>

            <section
              className="public-detail-card__section"
              aria-labelledby="edital-situacao"
            >
              <h3
                id="edital-situacao"
                className="public-detail-card__section-title"
              >
                Situação do processo
              </h3>

              <dl className="public-detail-card__facts">
                <div className="public-detail-card__fact">
                  <dt>Fase atual</dt>
                  <dd>{labelFaseEdital(faseAtual)}</dd>
                </div>
                <div className="public-detail-card__fact">
                  <dt>Status público</dt>
                  <dd>{resumoStatusPublico(registro)}</dd>
                </div>
                <div className="public-detail-card__fact">
                  <dt>Recebimento</dt>
                  <dd>{resumoPeriodoRecebimento(registro)}</dd>
                </div>
                {dataPublicacao && (
                  <div className="public-detail-card__fact">
                    <dt>Publicação</dt>
                    <dd>{dataPublicacao}</dd>
                  </div>
                )}
              </dl>

              <p
                className={`public-detail-card__notice public-detail-card__notice--${mensagemProposta.tipo}`}
              >
                {mensagemProposta.texto}
              </p>
            </section>

            <section
              className="public-detail-card__section"
              aria-labelledby="edital-timeline"
            >
              <h3
                id="edital-timeline"
                className="public-detail-card__section-title"
              >
                Andamento institucional
              </h3>

              <ol className="public-detail-card__timeline">
                {timeline.map((step) => (
                  <li
                    key={step.fase}
                    className={`public-detail-card__timeline-item public-detail-card__timeline-item--${step.estado}`}
                  >
                    <div className="public-detail-card__timeline-marker" />
                    <div className="public-detail-card__timeline-content">
                      <strong>{step.label}</strong>
                      <p>{step.resumo}</p>

                      {step.documentos.length > 0 && (
                        <ul className="public-detail-card__doc-list">
                          {step.documentos.map((doc) => {
                            const href = getDocumentoPublicoDownloadUrl(
                              doc.arquivo_url
                            );

                            return (
                              <li key={doc.id}>
                                {href ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {doc.titulo ||
                                      labelTipoDocumentoEdital(doc.tipo) ||
                                      "Documento oficial"}
                                  </a>
                                ) : (
                                  <span>
                                    {doc.titulo ||
                                      labelTipoDocumentoEdital(doc.tipo) ||
                                      "Documento oficial"}
                                  </span>
                                )}
                                {normalizarTextoEdital(doc.descricao) && (
                                  <span className="public-detail-card__doc-meta">
                                    {" "}
                                    — {doc.descricao}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section
              className="public-detail-card__section"
              aria-labelledby="edital-documentos"
            >
              <h3
                id="edital-documentos"
                className="public-detail-card__section-title"
              >
                Documentos oficiais
              </h3>

              <ul className="public-detail-card__doc-list public-detail-card__doc-list--stack">
                {downloadUrl && (
                  <li>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Edital principal (PDF)
                    </a>
                  </li>
                )}

                {documentosSemFase.map((doc) => {
                  const href = getDocumentoPublicoDownloadUrl(doc.arquivo_url);

                  return (
                    <li key={doc.id}>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {doc.titulo ||
                            labelTipoDocumentoEdital(doc.tipo) ||
                            "Documento oficial"}
                        </a>
                      ) : (
                        <span>
                          {doc.titulo ||
                            labelTipoDocumentoEdital(doc.tipo) ||
                            "Documento oficial"}
                        </span>
                      )}
                      {normalizarTextoEdital(doc.tipo) && (
                        <span className="public-detail-card__doc-meta">
                          {" "}
                          — {labelTipoDocumentoEdital(doc.tipo)}
                        </span>
                      )}
                    </li>
                  );
                })}

                {!downloadUrl && documentos.length === 0 && (
                  <li className="public-detail-card__empty">
                    Nenhum documento complementar publicado até o momento.
                  </li>
                )}
              </ul>
            </section>

            <section
              className="public-detail-card__section"
              aria-labelledby="edital-participar"
            >
              <h3
                id="edital-participar"
                className="public-detail-card__section-title"
              >
                Como participar
              </h3>

              <ol className="public-detail-card__steps">
                <li>Baixe e leia o edital principal com atenção aos critérios.</li>
                <li>
                  Separe a documentação exigida descrita na{" "}
                  <Link href="/editais#documentacao-exigida">
                    página de editais
                  </Link>
                  .
                </li>
                <li>
                  Envie a proposta pelo portal com o edital já selecionado.
                </li>
                <li>
                  Acompanhe aqui o andamento institucional e os documentos
                  publicados em cada fase.
                </li>
              </ol>

              <p className="public-detail-card__help">
                Resultados, atas e demais publicações também podem ser
                consultados na{" "}
                <Link href="/transparencia">página de transparência</Link>.
              </p>
            </section>
          </div>

          <div className="public-page-actions">
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                Baixar edital (PDF)
              </a>
            )}

            {podeEnviarProposta(registro) ? (
              <Link href={`/propostas?codigo=${registro.id}`}>
                Enviar proposta
              </Link>
            ) : (
              <span className="public-detail-card__action-disabled">
                Envio indisponível
              </span>
            )}

            <Link href="/editais">Voltar para lista</Link>
          </div>
        </article>
      </PublicPageContent>
    </>
  );
}
