"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { adminTokens } from "@/components/admin";
import { formatarCategoria, formatarTipoPessoa } from "@/lib/documental";
import { useResumoAnexosListagem } from "@/components/admin/propostas/useResumoAnexosListagem";
import { supabase } from "@/lib/supabaseClient";
import {
  getRotuloVinculoProposta,
  getUrlConsultaEditalAdmin,
  propostaTemVinculoOficial,
} from "@/lib/editais/governancaRules";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

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
  edital_id?: string | null;
  editais?:
    | {
        titulo?: string | null;
        fase_atual?: string | null;
        tipo?: string | null;
        processo_id?: string | null;
      }
    | {
        titulo?: string | null;
        fase_atual?: string | null;
        tipo?: string | null;
        processo_id?: string | null;
      }[]
    | null;
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
  borderRadius: 10,
  border: "1px solid #1e293b",
  color: "#fff",
  height: "100%",
  boxSizing: "border-box",
};

const listGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
  gap: adminTokens.spacing.md,
  marginTop: adminTokens.spacing.md,
  alignItems: "stretch",
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
  flexWrap: "wrap",
  gap: adminTokens.spacing.md,
  marginTop: adminTokens.spacing.lg,
};

const btnPad: Pick<CSSProperties, "padding"> = {
  padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
};

const linkBtnBase: CSSProperties = {
  ...btnPad,
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

export default function Page() {
  const escopo = useAdminEscopoCliente();
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const { resumo: resumoAnexos, carregando: carregandoResumoAnexos } =
    useResumoAnexosListagem(propostas);

  useEffect(() => {
    if (escopo.loading) return;
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo.loading, escopo.processoIds]);

  async function carregar() {
    setLoading(true);

    const { data } = await supabase
      .from("propostas")
      .select("*, editais(titulo, fase_atual, tipo, processo_id)")
      .order("criado_em", { ascending: false });

    const lista = ((data || []) as Proposta[]).filter((proposta) => {
      const edital = Array.isArray(proposta.editais)
        ? proposta.editais[0]
        : proposta.editais;
      return registroNoEscopoProcesso(edital?.processo_id, escopo.processoIds);
    });

    setPropostas(lista);
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

    if (status === "aprovado") {
      const ponte = await fetch("/api/admin/transparencia/ponte", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "convenio_de_proposta",
          propostaId: id,
        }),
      })
        .then((r) => r.json())
        .catch(() => null);

      if (ponte?.ok) {
        alert(ponte.message || "Rascunho de convenio criado na Transparencia.");
      } else if (ponte?.error) {
        alert(`Proposta aprovada, mas a ponte falhou: ${ponte.error}`);
      }
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
      <p
        style={{
          color: adminTokens.colors.text.muted,
          marginTop: adminTokens.spacing.sm,
          maxWidth: 860,
        }}
      >
        Acompanhe aqui as propostas enviadas pelo site, confira documentos e
        registre a decisão humana de aprovar ou rejeitar. Use{" "}
        <strong>Governança</strong> para fases e documentos oficiais do edital; use{" "}
        <strong>Ver edital</strong> para a página pública. Aprovação registra vínculo
        oficial; rejeição mantém histórico.
      </p>

      {propostas.length === 0 ? (
        <div style={{ ...cardStyle, marginTop: adminTokens.spacing.md }}>
          Nenhuma proposta recebida até o momento.
        </div>
      ) : (
        <div style={listGridStyle}>
        {propostas.map((p) => {
          const editalRelacionado = Array.isArray(p.editais) ? p.editais[0] : p.editais;
          const urlEdital =
            p.edital_id && getUrlConsultaEditalAdmin(p.edital_id, editalRelacionado);
          const abreNovaAba = urlEdital?.startsWith("/editais/");

          return (
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
              <strong>Edital:</strong>{" "}
              {editalRelacionado?.titulo || "sem vínculo"}
            </p>

            <p style={tightParaStyle}>
              <strong>Modalidade:</strong>{" "}
              {editalRelacionado?.tipo?.trim() || "—"}
            </p>

            <p style={tightParaStyle}>
              <strong>Vinculo:</strong>{" "}
              <span
                style={{
                  color: propostaTemVinculoOficial(p.status)
                    ? adminTokens.colors.success.background
                    : adminTokens.colors.text.muted,
                  fontWeight: adminTokens.typography.fontWeight.bold,
                }}
              >
                {getRotuloVinculoProposta(p.status)}
              </span>
            </p>

            <p style={tightParaStyle}>
              <strong>Status:</strong>{" "}
              <span
                style={{
                  color:
                    p.status === "aprovado"
                      ? adminTokens.colors.success.background
                      : p.status === "rejeitado"
                      ? adminTokens.colors.error.background
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
              {p.edital_id ? (
                <Link
                  href={`/admin/editais/${p.edital_id}/governanca`}
                  style={{
                    ...linkBtnBase,
                    background: "#0f766e",
                    color: "#fff",
                  }}
                >
                  Governança
                </Link>
              ) : null}

              {p.edital_id && urlEdital ? (
                <Link
                  href={urlEdital}
                  target={abreNovaAba ? "_blank" : undefined}
                  rel={abreNovaAba ? "noopener noreferrer" : undefined}
                  style={{
                    ...linkBtnBase,
                    background: "#0ea5e9",
                    color: "#fff",
                  }}
                >
                  {abreNovaAba ? "Ver edital" : "Ver edital (admin)"}
                </Link>
              ) : null}

              <Link
                href={`/admin/propostas/${p.id}`}
                style={{
                  ...linkBtnBase,
                  background: "#2563eb",
                  color: "#fff",
                }}
              >
                Ver proposta
              </Link>

              <button
                type="button"
                onClick={() => atualizarStatus(p.id, "aprovado")}
                style={{
                  background: adminTokens.colors.success.background,
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
                type="button"
                onClick={() => atualizarStatus(p.id, "rejeitado")}
                style={{
                  background: adminTokens.colors.error.background,
                  color: adminTokens.colors.error.text,
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
          );
        })}
        </div>
      )}
    </div>
  );
}
