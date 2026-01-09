"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";


type EditalStatus = "aberto" | "encerrado" | "em_breve";

type Edital = {
  id: string;
  titulo: string;
  periodo: string;
  status: EditalStatus;
  arquivo_pdf?: string;
};

export default function EditaisPublicPage() {
  const [editais, setEditais] = useState<Edital[]>([]);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("editais")
        .select("id, titulo, periodo, status, arquivo_pdf")
        .order("created_at", { ascending: false });

      setEditais(data || []);
    }

    carregar();
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="hero-rolling">
        <div className="hero-rolling__inner">
          <h1 className="hero__title">Editais e Chamadas Públicas</h1>
          <p className="hero__text">
            Consulte os editais e chamadas públicas promovidos pelo Instituto.
          </p>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="sobre">
        <div className="container" style={{ maxWidth: 1200 }}>

          {/* ========================= */}
          {/* BLOCO 1 — EDITAIS DINÂMICOS */}
          {/* ========================= */}
          <section style={{ marginBottom: 96 }}>
            <h2 style={{ marginBottom: 32 }}>
              Editais e Chamadas Ativas
            </h2>

            <div className="cards__grid">
              {editais.map((edital) => {
                const downloadUrl = edital.arquivo_pdf
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/editais/${edital.arquivo_pdf.replace(
                      /^editais\//,
                      ""
                    )}`
                  : null;

                return (
                  <article key={edital.id} className="card">
                    <div className="card__body">
                      <h3 className="card__title">
                        {edital.titulo}
                      </h3>

                      <p className="card__text">
                        <strong>Tipo:</strong> Chamamento público
                      </p>
                      <p className="card__text">
                        <strong>Período:</strong>{" "}
                        {edital.periodo || "Não informado"}
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

          {/* ================================= */}
          {/* BLOCO 2 — INFORMAÇÕES INSTITUCIONAIS */}
          {/* ================================= */}
          <section
            style={{
              background: "#f8fafc",
              borderRadius: 20,
              padding: "64px 72px",
              marginBottom: 120,
            }}
          >
            <div style={{ maxWidth: 820 }}>

              {/* DOCUMENTAÇÃO */}
              <h2 style={{ marginBottom: 20 }}>
                Documentação exigida para participação
              </h2>

              <p style={{ marginBottom: 32 }}>
                Para participar dos editais e chamadas públicas, as organizações
                interessadas deverão apresentar documentação institucional
                obrigatória no momento do envio da proposta.
              </p>

              <ul style={{ marginBottom: 36 }}>
                <li style={{ marginBottom: 8 }}>
                  <strong>Estatuto Social da organização proponente</strong>
                </li>
                <li>
                  <strong>CNPJ da organização proponente</strong>
                </li>
              </ul>

              <Link href="/propostas" className="card__link">
                Iniciar envio de proposta
              </Link>

              {/* FAQ */}
              <div style={{ marginTop: 64 }}>
                <h2 style={{ marginBottom: 28 }}>
                  Perguntas Frequentes
                </h2>

                <div style={{ marginBottom: 28 }}>
                  <strong>Quem pode participar?</strong>
                  <p>
                    Organizações da Sociedade Civil regularmente constituídas,
                    que atendam aos critérios definidos em cada edital.
                  </p>
                </div>

                <div style={{ marginBottom: 28 }}>
                  <strong>Como enviar a documentação exigida?</strong>
                  <p>
                    A documentação deverá ser anexada durante o envio da
                    proposta, por meio da plataforma.
                  </p>
                </div>

                <div>
                  <strong>Onde acompanho o resultado dos editais?</strong>
                  <p>
                    Os resultados serão divulgados nesta página e comunicados
                    aos participantes conforme previsto em cada edital.
                  </p>
                </div>
              </div>

            </div>
          </section>

        </div>
      </section>
    </>
  );
}




