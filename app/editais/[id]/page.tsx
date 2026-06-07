"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { PublicPageContent } from "@/components/public";
import PublicWhatsAppHelpLine from "@/components/public/PublicWhatsAppHelpLine";
import {
  editalStatusLabel,
  resolveEditalDownloadUrl,
} from "@/lib/editais/download";

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

export default function EditalDetalhePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [edital, setEdital] = useState<Edital | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEdital() {
      if (!id) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("editais")
        .select(
          "id, titulo, descricao, tipo, periodo, periodo_envio, status, arquivo_pdf"
        )
        .eq("id", id)
        .maybeSingle();

      if (data) setEdital(data as Edital);
      setLoading(false);
    }

    loadEdital();
  }, [id]);

  const downloadUrl = useMemo(
    () => resolveEditalDownloadUrl(edital?.arquivo_pdf),
    [edital?.arquivo_pdf]
  );

  const periodo =
    edital?.periodo_envio || edital?.periodo || "Não informado";

  const descricao = edital?.descricao?.trim();

  if (loading) {
    return (
      <>
        <PublicPageContent>
          <p>Carregando edital…</p>
        </PublicPageContent>
      </>
    );
  }

  if (!edital) {
    return (
      <>
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

  return (
    <>
      <PublicWhatsAppHelpLine
        assunto="editais"
        intro="Precisa de orientação sobre este edital?"
      />

      <PublicPageContent>
        <article className="public-detail-card">
          <div className="public-detail-card__body">
            <h1 className="public-article__title">{edital.titulo}</h1>
            {descricao && (
              <p className="public-detail-card__meta">
                <strong>Descrição:</strong> {descricao}
              </p>
            )}
            <p className="public-detail-card__meta">
              <strong>Tipo:</strong> {edital.tipo || "Chamamento público"}
            </p>
            <p className="public-detail-card__meta">
              <strong>Período:</strong> {periodo}
            </p>
            <p className="public-detail-card__meta">
              <strong>Status:</strong> {editalStatusLabel(edital.status)}
            </p>
          </div>

          <div className="public-page-actions">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Baixar edital (PDF)
              </a>
            )}

            <Link href={`/propostas?codigo=${edital.id}`}>
              Enviar proposta
            </Link>

            <Link href="/editais">Voltar para lista</Link>
          </div>
        </article>
      </PublicPageContent>
    </>
  );
}
