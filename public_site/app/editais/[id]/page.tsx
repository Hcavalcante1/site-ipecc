"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EditalDetalhePage() {
  const { id } = useParams();
  const [edital, setEdital] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEdital() {
      const { data } = await supabase
        .from("editais")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setEdital(data);
      setLoading(false);
    }

    if (id) loadEdital();
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

  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/editais`;

  return (
    <>
      <section className="hero-rolling">
        <div className="hero-rolling__inner">
          <h1 className="hero__title">{edital.titulo}</h1>
        </div>
      </section>

      <section className="sobre">
        <div className="container">
          <div className="card" style={{ maxWidth: 900 }}>
            <div className="card__body">
              <p className="card__text">
                <strong>Tipo:</strong> {edital.tipo}
              </p>

              <p className="card__text">
                <strong>Período:</strong> {edital.periodo}
              </p>

              <p className="card__text">
                <strong>Status:</strong>{" "}
                {edital.status === "aberto" && "Aberto"}
                {edital.status === "encerrado" && "Encerrado"}
                {edital.status === "em_breve" && "Em breve"}
              </p>
            </div>

            <div style={{ padding: "0 16px 16px", display: "flex", gap: 12 }}>
              <a
                href={`${storageBase}/${edital.arquivo_pdf}`}
                target="_blank"
                rel="noopener noreferrer"
                className="card__link"
              >
                Baixar edital (PDF)
              </a>

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
