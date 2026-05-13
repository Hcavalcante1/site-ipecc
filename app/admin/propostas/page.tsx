"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Proposta = {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  mensagem: string;
  tipo?: string;
  status?: string;
  categoria?: string | null;
};

function formatarTipoPessoa(tipo?: string) {
  if (tipo === "pessoa_juridica") return "Pessoa Jurídica";
  if (tipo === "osc") return "OSC";
  if (tipo === "pessoa_fisica") return "Pessoa Física";
  return "—";
}

function formatarCategoria(categoria?: string | null, mensagem?: string) {
  if (categoria === "habilitacao_juridica") return "Habilitação Jurídica";
  if (categoria === "regularidade_fiscal_trabalhista")
    return "Regularidade Fiscal e Trabalhista";
  if (categoria === "qualificacao_tecnica") return "Qualificação Técnica";

  if (!mensagem) return "—";

  const linha = mensagem
    .split("\n")
    .find((item) => item.trim().toLowerCase().startsWith("categoria:"));

  if (!linha) return "—";

  return linha.replace(/^categoria:\s*/i, "").trim() || "—";
}

export default function Page() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);

    const { data } = await supabase
      .from("propostas")
      .select("*")
      .order("criado_em", { ascending: false });

    setPropostas(data || []);
    setLoading(false);
  }

  async function atualizarStatus(id: string, status: string) {
    const { error } = await supabase
      .from("propostas")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Erro ao atualizar status");
      return;
    }

    carregar();
  }

  if (loading) return <p style={{ padding: 24 }}>Carregando...</p>;

  return (
    <div style={{ padding: 30 }}>
      <h1>Propostas Recebidas</h1>

      {propostas.length === 0 ? (
        <div
          style={{
            background: "#0f172a",
            padding: 20,
            marginTop: 10,
            borderRadius: 10,
            color: "#fff",
          }}
        >
          Nenhuma proposta recebida até o momento.
        </div>
      ) : (
        propostas.map((p) => (
          <div
            key={p.id}
            style={{
              background: "#0f172a",
              padding: 20,
              marginTop: 10,
              borderRadius: 10,
              color: "#fff",
            }}
          >
            <strong style={{ fontSize: 18 }}>{p.nome}</strong>

            <p style={{ marginTop: 10, marginBottom: 0 }}>
              <strong>Email:</strong> {p.email || "—"}
            </p>

            <p style={{ marginTop: 6, marginBottom: 0 }}>
              <strong>Telefone:</strong> {p.telefone || "—"}
            </p>

            <p style={{ marginTop: 6, marginBottom: 0 }}>
              <strong>CPF/CNPJ:</strong> {p.cnpj || "—"}
            </p>

            <p style={{ marginTop: 6, marginBottom: 0 }}>
              <strong>Tipo de Pessoa:</strong> {formatarTipoPessoa(p.tipo)}
            </p>

            <p style={{ marginTop: 6, marginBottom: 0 }}>
              <strong>Categoria:</strong> {formatarCategoria(p.categoria, p.mensagem)}
            </p>

            <p style={{ marginTop: 6, marginBottom: 0 }}>
              <strong>Status:</strong>{" "}
              <span
                style={{
                  color:
                    p.status === "aprovado"
                      ? "#22c55e"
                      : p.status === "rejeitado"
                      ? "#ef4444"
                      : "#facc15",
                  fontWeight: 700,
                }}
              >
                {p.status || "pendente"}
              </span>
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => (window.location.href = `/admin/propostas/${p.id}`)}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Ver
              </button>

              <button
                onClick={() => atualizarStatus(p.id, "aprovado")}
                style={{
                  background: "#22c55e",
                  color: "#022c22",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Aprovar
              </button>

              <button
                onClick={() => atualizarStatus(p.id, "rejeitado")}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Rejeitar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}