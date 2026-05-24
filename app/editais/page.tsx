// app/editais/page.tsx

import Link from "next/link";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";

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

  const { data: heroArray } = await supabase
    .from("paginas_conteudo")
    .select("titulo, texto")
    .eq("pagina_slug", "editais")
    .eq("bloco", "hero");

  const heroData = heroArray?.[0];

  const tituloHero = heroData?.titulo || "Editais e Chamadas Públicas";

  const textoHero =
    heroData?.texto ||
    "Consulte os editais e chamadas públicas promovidos pelo Instituto.";

  const { data: documentosBlocoArray } = await supabase
    .from("paginas_conteudo")
    .select("titulo, texto")
    .eq("pagina_slug", "editais")
    .eq("bloco", "documentos");

  const documentosBloco = documentosBlocoArray?.[0];

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

  const { data: ctaArray } = await supabase
    .from("paginas_conteudo")
    .select("*")
    .eq("pagina_slug", "editais")
    .eq("bloco", "cta")
    .limit(1);

  const cta = ctaArray?.[0] || null;

  return (
    <>
      {/* HERO */}
      <section className="hero-rolling">
        <div
          className="hero-rolling__inner"
          style={{
            ["--hero-bg-image" as any]: 'url("/media/heroes/editais/hero.webp")',
          }}


        >
          <h1 className="hero__title">{tituloHero}</h1>
          <p className="hero__text">{textoHero}</p>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="sobre">
        <div className="container" style={{ maxWidth: 1200 }}>
          {/* EDITAIS */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ marginBottom: 20 }}>Editais e Chamadas Ativas</h2>

            <div className="cards__grid">
              {(editais as Edital[] | null)?.map((edital) => {
                const periodo =
                  edital.periodo_envio || edital.periodo || "Não informado";

           
let downloadUrl = null;

if (edital.arquivo_pdf) {
  const path = edital.arquivo_pdf.includes("/docs/")
    ? edital.arquivo_pdf.split("/docs/")[1]
    : edital.arquivo_pdf.replace(/^editais\//, "");

  downloadUrl = `/api/download/docs/${path}`;
}
                return (
                  <article key={edital.id} className="card">
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
                        {edital.status === "aberto" && "Aberto"}
                        {edital.status === "encerrado" && "Encerrado"}
                        {edital.status === "em_breve" && "Em breve"}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "0 16px 20px",
                        display: "flex",
                        gap: 20,
                        flexWrap: "wrap",
                      }}
                    >
                      {downloadUrl && (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="card__link"
                        >
                          Baixar edital (PDF)
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
          </section>

          {/* DOCUMENTOS */}
          <section
            style={{
              background: "#f8fafc",
              borderRadius: 20,
              padding: "36px 40px",
              marginBottom: 56,
            }}
          >
            <div style={{ maxWidth: 980 }}>
              <h2 style={{ marginBottom: 20 }}>{tituloDocumentos}</h2>

              <p style={{ marginBottom: 28 }}>{textoDocumentos}</p>

              <div style={{ display: "grid", gap: 28 }}>
                {documentosAgrupados.map((grupo) => (
                  <div
                    key={grupo.tipo}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 18,
                      padding: 24,
                    }}
                  >
                    <h3
                      style={{
                        marginBottom: 18,
                        fontSize: 24,
                        color: "#0f172a",
                      }}
                    >
                      {grupo.titulo}
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                        gap: 20,
                      }}
                    >
                      {grupo.categorias.map((subgrupo) => (
                        <div
                          key={subgrupo.categoria}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            borderRadius: 16,
                            padding: 18,
                          }}
                        >
                          <h4
                            style={{
                              marginBottom: 14,
                              fontSize: 18,
                              color: "#0f172a",
                            }}
                          >
                            {subgrupo.titulo}
                          </h4>

                          {subgrupo.itens.length > 0 ? (
                            <ul style={{ paddingLeft: 18, margin: 0 }}>
                              {subgrupo.itens.map((doc) => (
                                <li key={doc.id} style={{ marginBottom: 10 }}>
                                  <strong>{doc.titulo}</strong>
                                  {doc.descricao ? ` — ${doc.descricao}` : ""}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p
                              style={{
                                margin: 0,
                                color: "#64748b",
                                fontSize: 14,
                              }}
                            >
                              Nenhum documento cadastrado nesta categoria.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* CTA CORRIGIDO */}
      <section className="sobre-cta" style={{ marginTop: 20 }}>
        <div className="container sobre-cta__grid">
          {/* ESQUERDA SEM CARD */}
          <div style={{ padding: 20 }}>
            <h2>{cta?.titulo}</h2>
            <p style={{ marginTop: 10 }}>{cta?.texto}</p>
          </div>

          {/* DIREITA */}
          <div className="cta-green__inner">
            <div>
              <h3>{cta?.extra?.titulo}</h3>
              <p>{cta?.extra?.descricao}</p>
            </div>

            <a
              href={cta?.extra?.botao_link || "/propostas"}
              className="btn-cta"
              style={{ width: "fit-content" }}
            >
              {cta?.extra?.botao_texto || "Enviar proposta"}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
