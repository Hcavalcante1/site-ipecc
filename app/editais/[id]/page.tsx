import Link from "next/link";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { PublicHeroRolling, PublicPageContent } from "@/components/public";
import PublicWhatsAppHelpLine from "@/components/public/PublicWhatsAppHelpLine";
import {
  editalStatusLabel,
  resolveEditalDownloadUrl,
} from "@/lib/editais/download";
import { logPublicFetch } from "@/lib/observability/publicFetchLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type EditalStatus = "aberto" | "encerrado" | "em_breve";

type Edital = {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo?: string | null;
  periodo?: string | null;
  periodo_envio?: string | null;
  status: EditalStatus;
  arquivo_pdf?: string | null;
};

type Props = {
  params: { id: string };
};

function normalizarTexto(valor?: string | null) {
  return valor?.trim() ?? "";
}

function renderParagrafos(texto: string) {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha, index) => <p key={index}>{linha}</p>);
}

export default async function EditalDetalhePage({ params }: Props) {
  const { data: edital, error } = await supabase
    .from("editais")
    .select(
      "id, titulo, descricao, tipo, periodo, periodo_envio, status, arquivo_pdf"
    )
    .eq("id", params.id)
    .maybeSingle();

  logPublicFetch({
    page: `/editais/${params.id}`,
    table: "editais",
    count: edital ? 1 : 0,
    error: error?.message,
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

  const registro = edital as Edital;
  const titulo = normalizarTexto(registro.titulo);
  const descricao = normalizarTexto(registro.descricao);
  const periodo =
    registro.periodo_envio || registro.periodo || "Não informado";
  const downloadUrl = resolveEditalDownloadUrl(registro.arquivo_pdf);

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

      <PublicPageContent className="public-content--article">
        <article className="public-detail-card">
          <div className="public-detail-card__body">
            <h1 className="public-article__title">{titulo}</h1>

            {descricao && (
              <div className="public-article__body">
                {renderParagrafos(descricao)}
              </div>
            )}

            <p className="public-detail-card__meta">
              <strong>Tipo:</strong> {registro.tipo || "Chamamento público"}
            </p>
            <p className="public-detail-card__meta">
              <strong>Período:</strong> {periodo}
            </p>
            <p className="public-detail-card__meta">
              <strong>Status:</strong> {editalStatusLabel(registro.status)}
            </p>
          </div>

          <div className="public-page-actions">
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                Baixar edital (PDF)
              </a>
            )}

            <Link href={`/propostas?codigo=${registro.id}`}>
              Enviar proposta
            </Link>

            <Link href="/editais">Voltar para lista</Link>
          </div>
        </article>
      </PublicPageContent>
    </>
  );
}
