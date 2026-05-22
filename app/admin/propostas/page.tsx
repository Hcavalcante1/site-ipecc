"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { adminTokens } from "@/components/admin";
import { formatarCategoria, formatarTipoPessoa } from "@/lib/documental";
import { useResumoAnexosListagem } from "@/components/admin/propostas/useResumoAnexosListagem";
import { supabase } from "@/lib/supabaseClient";

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
  [key: string]: unknown;
};

const loadingStyle: CSSProperties = {
  padding: adminTokens.spacing.xxxl,
};

const shellStyle: CSSProperties = {
  padding: adminTokens.spacing.base + adminTokens.spacing.xl,
};

const cardStyle: CSSProperties = {
  background: "#0f172a",
  padding: adminTokens.spacing.base + adminTokens.spacing.sm,
  marginTop: adminTokens.spacing.md,
  borderRadius: 10,
  color: "#fff",
};

const blockParaStyle: CSSProperties = {
  marginTop: adminTokens.spacing.md,
  marginBottom: 0,
};

const tightParaStyle: CSSProperties = {
  marginTop: adminTokens.spacing.xs,
  marginBottom: 0,
};

const acoesRowStyle: CSSProperties = {
  display: "flex",
  gap: adminTokens.spacing.md,
  marginTop: adminTokens.spacing.lg,
};

const btnPad: Pick<CSSProperties, "padding"> = {
  padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
};

export default function Page() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const { resumo: resumoAnexos, carregando: carregandoResumoAnexos } =
    useResumoAnexosListagem(propostas);

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

  if (loading) return <p style={loadingStyle}>Carregando...</p>;

  return (
    <div style={shellStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: adminTokens.spacing.md,
        }}
      >
        <h1 style={{ margin: 0 }}>Propostas Recebidas</h1>
        <a
          href="/admin/propostas/auditoria"
          style={{
            color: "#93c5fd",
            fontSize: 14,
            textDecoration: "none",
            fontWeight: adminTokens.typography.fontWeight.bold,
          }}
        >
          Auditoria de anexos (read-only)
        </a>
      </div>

      {propostas.length === 0 ? (
        <div style={cardStyle}>
          Nenhuma proposta recebida até o momento.
        </div>
      ) : (
        propostas.map((p) => (
          <div key={p.id} style={cardStyle}>
            <strong style={{ fontSize: 18 }}>{p.nome}</strong>

            <p style={blockParaStyle}>
              <strong>Email:</strong> {p.email || "—"}
            </p>

            <p style={tightParaStyle}>
              <strong>Telefone:</strong> {p.telefone || "—"}
            </p>

            <p style={tightParaStyle}>
              <strong>CPF/CNPJ:</strong> {p.cnpj || "—"}
            </p>

            <p style={tightParaStyle}>
              <strong>Tipo de Pessoa:</strong> {formatarTipoPessoa(p.tipo)}
            </p>

            <p style={tightParaStyle}>
              <strong>Categoria:</strong> {formatarCategoria(p.categoria, p.mensagem)}
            </p>

            <p style={tightParaStyle}>
              <strong>Status:</strong>{" "}
              <span
                style={{
                  color:
                    p.status === "aprovado"
                      ? "#22c55e"
                      : p.status === "rejeitado"
                      ? "#ef4444"
                      : "#facc15",
                  fontWeight: adminTokens.typography.fontWeight.bold,
                }}
              >
                {p.status || "pendente"}
              </span>
            </p>

            {carregandoResumoAnexos ? (
              <p style={{ ...tightParaStyle, color: adminTokens.colors.text.muted, fontSize: 13 }}>
                <strong>Anexos:</strong> verificando storage…
              </p>
            ) : resumoAnexos[p.id]?.orfaos ? (
              <p style={{ ...tightParaStyle, fontSize: 13 }}>
                <strong>Anexos:</strong>{" "}
                <span style={{ color: "#f97316", fontWeight: adminTokens.typography.fontWeight.bold }}>
                  {resumoAnexos[p.id].orfaos} sem arquivo no storage
                </span>
                <span style={{ color: adminTokens.colors.text.muted }}>
                  {" "}
                  ({resumoAnexos[p.id].disponiveis}/{resumoAnexos[p.id].total} disponíveis)
                </span>
              </p>
            ) : resumoAnexos[p.id]?.total ? (
              <p style={{ ...tightParaStyle, color: "#22c55e", fontSize: 13 }}>
                <strong>Anexos:</strong> todos disponíveis no storage ({resumoAnexos[p.id].total})
              </p>
            ) : null}

            <div style={acoesRowStyle}>
              <button
                onClick={() => (window.location.href = `/admin/propostas/${p.id}`)}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  ...btnPad,
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
                  ...btnPad,
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
                  ...btnPad,
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