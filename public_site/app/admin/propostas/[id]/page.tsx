"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Proposta = {
  id: number;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  mensagem: string;
  arquivo_url: string | null;
  estatuto_url: string | null;
  cnpj_url: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

function AnexoLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;

  return (
    <p>
      <a href={`${storageBase}/${href}`} target="_blank" rel="noreferrer">
        {label}
      </a>
    </p>
  );
}

export default function AdminPropostaDetalhePage() {
  const { id } = useParams();
  const [proposta, setProposta] = useState<Proposta | null>(null);
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

  return (
    <div style={{ padding: 24 }}>
      <h1>Detalhe da Proposta</h1>

      <p><strong>Empresa:</strong> {proposta.nome}</p>
      <p><strong>CNPJ:</strong> {proposta.cnpj}</p>
      <p><strong>Email:</strong> {proposta.email}</p>
      <p><strong>Telefone:</strong> {proposta.telefone}</p>
      <p><strong>Mensagem:</strong> {proposta.mensagem}</p>

      <AnexoLink href={proposta.arquivo_url} label="Baixar Proposta (PDF)" />
      <AnexoLink href={proposta.estatuto_url} label="Baixar Estatuto Social (PDF)" />
      <AnexoLink href={proposta.cnpj_url} label="Baixar Cartão CNPJ (PDF)" />
    </div>
  );
}

