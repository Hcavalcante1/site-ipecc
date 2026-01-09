"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  criado_em: string | null;
};

export default function AdminPropostasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarPropostas() {
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("Erro ao buscar propostas:", error);
      } else {
        setPropostas(data || []);
      }

      setLoading(false);
    }

    carregarPropostas();
  }, []);

  return (
    <section style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>
        Propostas Recebidas
      </h1>

      {loading && <p>Carregando propostas...</p>}

      {!loading && propostas.length === 0 && (
        <p>Nenhuma proposta recebida.</p>
      )}

      {propostas.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <strong>{p.nome}</strong>

          <p>CNPJ: {p.cnpj}</p>
          <p>Email: {p.email}</p>
          <p>Telefone: {p.telefone}</p>
          <p>Mensagem: {p.mensagem}</p>

          {p.criado_em && (
            <p>
              Enviado em:{" "}
              {new Date(p.criado_em).toLocaleString("pt-BR")}
            </p>
          )}

          {p.arquivo_url && (
            <p>
              <a
                href={`${supabaseUrl}/storage/v1/object/public/${p.arquivo_url}`}
                target="_blank"
                rel="noreferrer"
              >
                📄 Baixar Proposta
              </a>
            </p>
          )}

          {p.estatuto_url && (
            <p>
              <a
                href={`${supabaseUrl}/storage/v1/object/public/${p.estatuto_url}`}
                target="_blank"
                rel="noreferrer"
              >
                📄 Baixar Estatuto Social
              </a>
            </p>
          )}

          {p.cnpj_url && (
            <p>
              <a
                href={`${supabaseUrl}/storage/v1/object/public/${p.cnpj_url}`}
                target="_blank"
                rel="noreferrer"
              >
                📄 Baixar Cartão CNPJ
              </a>
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
