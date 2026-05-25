"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PropostaDetalhe = {
  nome?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  mensagem?: string;
  arquivo_url?: string | null;
  estatuto_url?: string | null;
  cnpj_url?: string | null;
};

export default function AdminPropostaDetalhePage() {
  const { id } = useParams();
  const [proposta, setProposta] = useState<PropostaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

  useEffect(() => {
    async function carregar() {
      setErro(null);

      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Erro ao carregar proposta:", error);
        setErro("Nao foi possivel carregar os detalhes da proposta agora.");
      } else {
        setProposta(data);
      }

      setLoading(false);
    }

    carregar();
  }, [id]);

  if (loading) return <p>Carregando...</p>;
  if (erro) return <p style={{ color: "#fecaca" }}>{erro}</p>;
  if (!proposta) return <p>Proposta não encontrada.</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Detalhe da Proposta</h1>

      <p><strong>Empresa:</strong> {proposta.nome}</p>
      <p><strong>CNPJ:</strong> {proposta.cnpj}</p>
      <p><strong>Email:</strong> {proposta.email}</p>
      <p><strong>Telefone:</strong> {proposta.telefone}</p>
      <p><strong>Mensagem:</strong> {proposta.mensagem}</p>

      {proposta.arquivo_url && (
        <p>
          <a
            href={`${storageBase}/${proposta.arquivo_url}`}
            target="_blank"
            rel="noreferrer"
          >
            Baixar Proposta (PDF)
          </a>
        </p>
      )}

      {proposta.estatuto_url && (
        <p>
          <a
            href={`${storageBase}/${proposta.estatuto_url}`}
            target="_blank"
            rel="noreferrer"
          >
            Baixar Estatuto Social (PDF)
          </a>
        </p>
      )}

      {proposta.cnpj_url && (
        <p>
          <a
            href={`${storageBase}/${proposta.cnpj_url}`}
            target="_blank"
            rel="noreferrer"
          >
            Baixar Cartão CNPJ (PDF)
          </a>
        </p>
      )}
    </div>
  );
}

