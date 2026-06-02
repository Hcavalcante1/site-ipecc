// app/editais/page.tsx

import Link from "next/link";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { PublicHeroRolling, PublicPageContent } from "@/components/public";
import PublicWhatsAppHelpLine from "@/components/public/PublicWhatsAppHelpLine";
import {
  editalStatusLabel,
  resolveEditalDownloadUrl,
} from "@/lib/editais/download";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";
import { fetchPaginaConteudo } from "@/lib/cms/paginasConteudoServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

type EditalStatus = "aberto" | "encerrado" | "em_breve";

type Edital = {
  id: string;
  titulo: string;
  tipo?: string;
  periodo?: string;
  periodo_envio?: string;
  status: EditalStatus;
  arquivo_pdf?: string;
};

type TipoPessoa = "pessoa_juridica" | "osc" | "pessoa_fisica";
type CategoriaDocumento =
  | "habilitacao_juridica"
  | "regularidade_fiscal_trabalhista"
  | "qualificacao_tecnica";

type Documento = {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo_pessoa?: TipoPessoa | null;
  categoria?: CategoriaDocumento | null;
  ordem?: number | null;
  ativo?: boolean;
  pagina_slug?: string;
};

const TITULOS_TIPO_PESSOA: Record<TipoPessoa, string> = {
  pessoa_juridica: "Pessoa Jurídica",
  osc: "OSC",
  pessoa_fisica: "Pessoa Física",
};

const TITULOS_CATEGORIA: Record<CategoriaDocumento, string> = {
  habilitacao_juridica: "Habilitação Jurídica",
  regularidade_fiscal_trabalhista: "Regularidade Fiscal e Trabalhista",
  qualificacao_tecnica: "Qualificação Técnica",
};

export default async function EditaisPublicPage() {
  const { data: editais, error: editaisError } = await supabase
    .from("editais")
    .select("id, titulo, tipo, periodo_envio, periodo, status, arquivo_pdf")
    .order("created_at", { ascending: false });

  logPublicFetch({
    page: "/editais",
    table: "editais",
    count: editais?.length ?? 0,
    error: editaisError?.message,
  });

  const heroData = await fetchPaginaConteudo(
    supabase,
    "editais",
    "hero",
    "titulo, texto"
  );

  const tituloHero = heroData?.titulo || "Editais e Chamadas Públicas";

  const textoHero =
    heroData?.texto ||
    "Consulte os editais e chamadas públicas promovidos pelo Instituto.";

  const documentosBloco = await fetchPaginaConteudo(
    supabase,
    "editais",
    "documentos",
    "titulo, texto"
  );

  const tituloDocumentos =
    documentosBloco?.titulo || "Documentação exigida para participação";

  const textoDocumentos =
    documentosBloco?.texto ||
    "Para participar dos editais e chamadas públicas, as organizações interessadas deverão apresentar documentação institucional obrigatória no momento do envio da proposta.";

  const { data: documentosData } = await supabase
    .from("editais_documentos")
    .select("*")
    .eq("ativo", true)
    .eq("pagina_slug", "editais")
    .order("ordem", { ascending: true });

  const documentos = (documentosData || []) as Documento[];

  const tiposPessoa: TipoPessoa[] = [
    "pessoa_juridica",
    "osc",
    "pessoa_fisica",
  ];

  const categorias: CategoriaDocumento[] = [
    "habilitacao_juridica",
    "regularidade_fiscal_trabalhista",
    "qualificacao_tecnica",
  ];

  const documentosAgrupados = tiposPessoa.map((tipo) => ({
    tipo,
    titulo: TITULOS_TIPO_PESSOA[tipo],
    categorias: categorias.map((categoria) => ({
      categoria,
      titulo: TITULOS_CATEGORIA[categoria],
      itens: documentos
        .filter(
          (doc) => doc.tipo_pessoa === tipo && doc.categoria === categoria
        )
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
    })),
  }));

  const cta = await fetchPaginaConteudo(supabase, "editais", "cta");
  const ctaExtra =
    cta?.extra && typeof cta.extra === "object"
      ? (cta.extra as {
          titulo?: string;
          descricao?: string;
          botao_link?: string;
          botao_texto?: string;
        })
      : null;

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/editais/hero.webp"
        title={tituloHero}
        text={textoHero}
      />

      <PublicWhatsAppHelpLine
        assunto="editais"
        intro="Precisa de orientação sobre um edital?"
        linkLabel="Fale conosco no WhatsApp"
      />

      <section className="sobre">
        <div className="container">
          <h2 style={{ marginBottom: 24 }}>Editais e chamadas ativas</h2>

          {(editais as Edital[] | null)?.length ? (
            <div className="cards__grid">
              {(editais as Edital[]).map((edital) => {
                const periodo =
                  edital.periodo_envio || edital.periodo || "Não informado";
                const downloadUrl = resolveEditalDownloadUrl(edital.arquivo_pdf);

                return (
                  <article
                    key={edital.id}
                    className="card public-edital-card"
                  >
                    <div className="card__body">
                      <h3 className="card__title">{edital.titulo}</h3>
                      <p className="card__text">
                        <strong>Tipo:</strong>{" "}
                        {edital.tipo || "Chamamento público"}
                      </p>
                      <p className="card__text">
                        <strong>Período:</strong> {periodo}
                      </p>
                      <p className="card__text">
                        <strong>Status:</strong>{" "}
                        {editalStatusLabel(edital.status)}
                      </p>
                    </div>

                    <div className="public-page-actions">
                      <Link
                        href={`/editais/${edital.id}`}
                        className="card__link"
                      >
                        Ver detalhes
                      </Link>
                      {downloadUrl && (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="card__link"
                        >
                          Baixar PDF
                        </a>
                      )}
                      <Link
                        href={`/propostas?codigo=${edital.id}`}
                        className="card__link"
                      >
                        Enviar proposta
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="public-page-lead">Nenhum edital publicado no momento.</p>
          )}

          <section className="public-docs-panel" style={{ marginTop: 40 }}>
            <h2 className="public-section__title">{tituloDocumentos}</h2>
            <p className="public-docs-panel__lead">{textoDocumentos}</p>

            {documentosAgrupados.map((grupo) => (
              <div key={grupo.tipo} className="public-docs-group">
                <h3 className="public-docs-group__title">{grupo.titulo}</h3>
                <div className="public-docs-categories">
                  {grupo.categorias.map((subgrupo) => (
                    <div
                      key={subgrupo.categoria}
                      className="public-docs-category"
                    >
                      <h4 className="public-docs-category__title">
                        {subgrupo.titulo}
                      </h4>
                      {subgrupo.itens.length > 0 ? (
                        <ul>
                          {subgrupo.itens.map((doc) => (
                            <li key={doc.id}>
                              <strong>{doc.titulo}</strong>
                              {doc.descricao ? `: ${doc.descricao}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="public-page-lead" style={{ marginBottom: 0 }}>
                          Nenhum documento nesta categoria.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </section>

      <section className="sobre-cta">
        <div className="container sobre-cta__grid">
          <div>
            <h2>{cta?.titulo || "Envie sua proposta"}</h2>
            <p className="public-page-lead" style={{ marginTop: 10 }}>
              {cta?.texto ||
                "Utilize o portal de propostas com checklist documental."}
            </p>
          </div>

          <div className="cta-green__inner">
            <div>
              <h3>{ctaExtra?.titulo || "Participar de um edital"}</h3>
              <p>{ctaExtra?.descricao || "Envie documentação e acompanhe o status."}</p>
            </div>
            <Link
              href={ctaExtra?.botao_link || "/propostas"}
              className="btn-cta"
            >
              {ctaExtra?.botao_texto || "Enviar proposta"}
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}
