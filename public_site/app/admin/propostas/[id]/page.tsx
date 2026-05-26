"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabase = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PropostaDetalhe = {
  id: string | number;
  nome: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  arquivo_url: string | null;
  estatuto_url: string | null;
  cnpj_url: string | null;
  criado_em?: string | null;
};

export default function AdminPropostaDetalhePage() {
  const { id } = useParams();
  const [proposta, setProposta] = useState<PropostaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .eq("id", id)
        .single();

      if (!error) {
        setProposta(data);
      }

      setLoading(false);
    }

    carregar();
  }, [id]);

  if (loading) return <p>Carregando...</p>;
  if (!proposta) return <p>Proposta não encontrada.</p>;

  const anexos = [
    { label: "Baixar Proposta (PDF)", url: proposta.arquivo_url },
    { label: "Baixar Estatuto Social (PDF)", url: proposta.estatuto_url },
    { label: "Baixar Cartão CNPJ (PDF)", url: proposta.cnpj_url },
  ].filter((anexo): anexo is { label: string; url: string } => Boolean(anexo.url));

  return (
    <div style={{ padding: 24 }}>
      <h1>Detalhe da Proposta</h1>

      <p><strong>Empresa:</strong> {proposta.nome}</p>
      <p><strong>CNPJ:</strong> {proposta.cnpj}</p>
      <p><strong>Email:</strong> {proposta.email}</p>
      <p><strong>Telefone:</strong> {proposta.telefone}</p>
      <p><strong>Mensagem:</strong> {proposta.mensagem}</p>

      <h2 style={{ fontSize: 20, marginTop: 24, marginBottom: 12 }}>Anexos</h2>

      {anexos.length === 0 && <p>Nenhum anexo informado.</p>}

      {anexos.map((anexo) => (
        <p key={anexo.label}>
          <a
            href={`${supabaseUrl}/storage/v1/object/public/${anexo.url}`}
            target="_blank"
            rel="noreferrer"
          >
            {anexo.label}
          </a>
        </p>
      ))}
    </div>
  );
}

