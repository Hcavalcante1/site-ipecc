"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPropostaDetalhePage() {
  const { id } = useParams();
  const [proposta, setProposta] = useState<any>(null);
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

      {proposta.arquivo_url && (
        <p>
          <a
            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${proposta.arquivo_url}`}
            target="_blank"
            rel="noreferrer"
          >
            Baixar Proposta (PDF)
          </a>
        </p>
      )}
    </div>
  );
}

