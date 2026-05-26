"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const anexos = [
  { campo: "arquivo_url", rotulo: "Baixar Proposta (PDF)" },
  { campo: "estatuto_url", rotulo: "Baixar Estatuto Social (PDF)" },
  { campo: "cnpj_url", rotulo: "Baixar CNPJ (PDF)" },
];

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

      {anexos.map(({ campo, rotulo }) => {
        const caminho = proposta[campo];
        if (!caminho) return null;

        return (
          <p key={campo}>
            <a
              href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${caminho}`}
              target="_blank"
              rel="noreferrer"
            >
              {rotulo}
            </a>
          </p>
        );
      })}
    </div>
  );
}

