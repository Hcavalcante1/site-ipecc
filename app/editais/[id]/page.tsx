"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import { PublicHeroRolling } from "@/components/public";

export default function EditalDetalhePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [edital, setEdital] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEdital() {
      if (!id) return;

      const { data } = await supabase
        .from("editais")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setEdital(data);
      setLoading(false);
    }

    loadEdital();
  }, [id]);

  if (loading) {
    return (
      <section className="sobre">
        <div className="container">
          <p>Carregando edital…</p>
        </div>
      </section>
    );
  }

  if (!edital) {
    return (
      <section className="sobre">
        <div className="container">
          <h2>Edital não encontrado</h2>
          <Link href="/editais" className="card__link">
            Voltar para editais
          </Link>
        </div>
      </section>
    );
  }

  const arquivo = edital.arquivo_pdf
    ? edital.arquivo_pdf.replace(/^editais\//, "")
    : null;

  return (
    <>
      <PublicHeroRolling
        bgImage="/media/heroes/editais/hero.webp"
        title={edital.titulo}
      />

      <section className="sobre">
        <div className="container">
          <div className="card" style={{ maxWidth: 900 }}>
            <div className="card__body">
              <p className="card__text">
                <strong>Tipo:</strong> {edital.tipo || "—"}
              </p>

              <p className="card__text">
                <strong>Período:</strong> {edital.periodo || "—"}
              </p>

              <p className="card__text">
                <strong>Status:</strong>{" "}
                {edital.status === "aberto" && "Aberto"}
                {edital.status === "encerrado" && "Encerrado"}
                {edital.status === "em_breve" && "Em breve"}
              </p>
            </div>

            <div className="public-page-actions">
              {arquivo && (
                <a
                 href={`/api/download/editais/${arquivo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card__link"
                >
                  Baixar edital (PDF)
                </a>
              )}

              <Link
                href={`/propostas?codigo=${edital.id}`}
                className="card__link"
              >
                Enviar Proposta
              </Link>

              <Link href="/editais" className="card__link">
                Voltar para lista
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}