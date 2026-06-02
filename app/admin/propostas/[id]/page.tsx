"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminTokens } from "@/components/admin";
import { supabase } from "@/lib/supabaseClient";
import {
  btn,
  ChecklistDocumentalProposta,
  PainelStatusDocumental,
  RegularidadeFiscalEntidade,
  AdminSubstituirAnexoProposta,
} from "@/components/admin/propostas/detail";
import { usePropostaDocumental } from "@/components/admin/propostas/usePropostaDocumental";
import { usePropostaDownloadsVerificados } from "@/components/admin/propostas/usePropostaDownloadsVerificados";
import {
  type CertidaoEntidade,
  type CertidaoEntidadeLinha,
} from "@/lib/documental";

type CertidaoTipo = {
  id: string;
  codigo: string;
  nome: string;
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

const sectionTitleStyle: CSSProperties = {
  fontSize: 18,
  display: "block",
  marginBottom: adminTokens.spacing.md,
};

const tightParaStyle: CSSProperties = {
  marginTop: adminTokens.spacing.xs,
  marginBottom: 0,
};

const fullSpanStyle: CSSProperties = {
  gridColumn: "1 / -1",
};

function corStatus(status?: string) {
  if (status === "aprovado") return adminTokens.colors.success.background;
  if (status === "rejeitado") return adminTokens.colors.error.background;
  return "#facc15";
}

export default function Page() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [proposta, setProposta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [certidoesEntidade, setCertidoesEntidade] = useState<CertidaoEntidadeLinha[]>(
    []
  );
  const [carregandoCertidoes, setCarregandoCertidoes] = useState(false);

  useEffect(() => {
    void carregarProposta();
  }, [id]);

  async function carregarProposta() {
    if (!id) return;

    setLoading(true);
    const { data } = await supabase.from("propostas").select("*").eq("id", id);

    if (data && data.length > 0) {
      setProposta(data[0]);
    } else {
      setProposta(null);
    }

    setLoading(false);
  }

  const {
    cnpjProposta,
    tipoPessoa,
    categoria,
    mensagemPrincipal,
    checklistDocumental,
    totalItensChecklist,
    resumoAnexos,
    diagnosticoDocumental,
    downloads,
  } = usePropostaDocumental(proposta, certidoesEntidade);

  const { disponiveis: downloadsDisponiveis, orfaos: downloadsOrfaos, verificando: verificandoDownloads } =
    usePropostaDownloadsVerificados(downloads);

  useEffect(() => {
    async function carregarCertidoesEntidade() {
      if (!cnpjProposta || cnpjProposta.length !== 14) {
        setCertidoesEntidade([]);
        return;
      }

      setCarregandoCertidoes(true);

      const [certidoesRes, tiposRes] = await Promise.all([
        supabase
          .from("certidoes")
          .select(
            "id, tipo_id, orgao_emissor, esfera, validade_ate, status, versao"
          )
          .eq("organizacao_cnpj", cnpjProposta)
          .order("validade_ate", { ascending: true }),
        supabase
          .from("certidao_tipos")
          .select("id, codigo, nome")
          .eq("ativo", true),
      ]);

      if (certidoesRes.error || tiposRes.error) {
        setCertidoesEntidade([]);
        setCarregandoCertidoes(false);
        return;
      }

      const tiposMap = new Map<string, CertidaoTipo>();
      (tiposRes.data || []).forEach((tipo) => {
        tiposMap.set(tipo.id, tipo as CertidaoTipo);
      });

      const linhas: CertidaoEntidadeLinha[] = ((certidoesRes.data || []) as CertidaoEntidade[]).map(
        (item) => {
          const tipo = tiposMap.get(item.tipo_id);
          return {
            ...item,
            tipo_nome: tipo?.nome ?? "—",
          };
        }
      );

      setCertidoesEntidade(linhas);
      setCarregandoCertidoes(false);
    }

    if (proposta) {
      carregarCertidoesEntidade();
    }
  }, [proposta, cnpjProposta]);

  async function excluirProposta() {
    if (!confirm("Deseja excluir esta proposta?")) return;

    await supabase.from("propostas").delete().eq("id", id);
    router.push("/admin/propostas");
  }

  function url(caminho: string | null) {
    if (!caminho) return null;

    return `/api/download/public/propostas/${caminho}`;
  }

  if (loading)
    return (
      <p style={{ padding: adminTokens.spacing.xxxl }}>Carregando...</p>
    );
  if (!proposta)
    return (
      <p style={{ padding: adminTokens.spacing.xxxl }}>Proposta não encontrada</p>
    );

  return (
    <div style={shellStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: adminTokens.spacing.md,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: "#fff" }}>
            Detalhe da Proposta
          </h1>
          <p
            style={{
              marginTop: adminTokens.spacing.sm,
              marginBottom: 0,
              color: adminTokens.colors.text.muted,
              fontSize: 14,
            }}
          >
            Revise dados, anexos, checklist documental e regularidade antes de
            decidir manualmente pela aprovacao ou rejeicao da proposta.
          </p>
        </div>
        <a
          href="/admin/propostas"
          style={{
            color: "#93c5fd",
            fontSize: 14,
            textDecoration: "none",
            fontWeight: adminTokens.typography.fontWeight.bold,
          }}
        >
          ← Voltar às propostas
        </a>
      </div>

      <div style={listGridStyle}>
        <div style={cardStyle}>
          <strong style={sectionTitleStyle}>{proposta.nome || "—"}</strong>
          <p style={tightParaStyle}>
            <strong>Email:</strong> {proposta.email || "—"}
          </p>
          <p style={tightParaStyle}>
            <strong>Telefone:</strong> {proposta.telefone || "—"}
          </p>
          <p style={tightParaStyle}>
            <strong>Documento:</strong> {proposta.cnpj || "—"}
          </p>
          <p style={tightParaStyle}>
            <strong>Status:</strong>{" "}
            <span
              style={{
                color: corStatus(proposta.status),
                fontWeight: adminTokens.typography.fontWeight.bold,
              }}
            >
              {proposta.status || "pendente"}
            </span>
          </p>
        </div>

        <div style={cardStyle}>
          <strong style={sectionTitleStyle}>Classificação</strong>
          <p style={{ ...tightParaStyle, marginTop: 0 }}>
            <strong>Tipo de Pessoa:</strong> {tipoPessoa}
          </p>
          <p style={tightParaStyle}>
            <strong>Categoria:</strong> {categoria}
          </p>
        </div>

        <div style={cardStyle}>
          <strong style={sectionTitleStyle}>Mensagem principal</strong>
          <div
            style={{
              whiteSpace: "pre-line",
              lineHeight: 1.6,
              color: adminTokens.colors.text.muted,
              fontSize: 14,
            }}
          >
            {mensagemPrincipal || "—"}
          </div>
        </div>

        <div style={cardStyle}>
          <strong style={sectionTitleStyle}>Anexos informados</strong>
          {resumoAnexos.length === 0 ? (
            <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
              —
            </span>
          ) : (
            <div
              style={{
                display: "grid",
                gap: adminTokens.spacing.sm,
              }}
            >
              {resumoAnexos.map((item, index) => (
                <p
                  key={`${item.chave}-${index}`}
                  style={{
                    ...tightParaStyle,
                    marginTop: index === 0 ? 0 : adminTokens.spacing.xs,
                    fontSize: 13,
                    wordBreak: "break-word",
                  }}
                >
                  <strong>{item.chave}:</strong> {item.valor || "—"}
                </p>
              ))}
            </div>
          )}
        </div>

        <div style={fullSpanStyle}>
          <PainelStatusDocumental diagnostico={diagnosticoDocumental} />
        </div>

        <div style={fullSpanStyle}>
          <ChecklistDocumentalProposta
            checklist={checklistDocumental}
            totalItens={totalItensChecklist}
            proposta={proposta}
            url={url}
          />
        </div>

        <div style={fullSpanStyle}>
          <RegularidadeFiscalEntidade
            carregando={carregandoCertidoes}
            cnpjDigitos={cnpjProposta}
            certidoes={certidoesEntidade}
          />
        </div>

        <div style={fullSpanStyle}>
          <AdminSubstituirAnexoProposta
            propostaId={String(id)}
            onAtualizado={carregarProposta}
          />
        </div>

        <div style={{ ...cardStyle, ...fullSpanStyle }}>
          <strong style={sectionTitleStyle}>Downloads</strong>
          <div
            style={{
              display: "flex",
              gap: adminTokens.spacing.md,
              flexWrap: "wrap",
            }}
          >
            {verificandoDownloads && downloads.length > 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Verificando anexos no storage…
              </span>
            ) : downloadsDisponiveis.length === 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Nenhum documento disponível para download.
              </span>
            ) : (
              downloadsDisponiveis.map((item) => (
                <a
                  key={item.label}
                  href={url(item.path)!}
                  target="_blank"
                  rel="noreferrer"
                  style={btn(item.bg, item.color)}
                >
                  {item.label}
                </a>
              ))
            )}
          </div>
          {downloadsOrfaos.length > 0 && (
            <p
              style={{
                marginTop: adminTokens.spacing.md,
                marginBottom: 0,
                color: "#f97316",
                fontSize: 13,
              }}
            >
              Sem arquivo no storage:{" "}
              {downloadsOrfaos.map((o) => `${o.label} (${o.path})`).join("; ")}
            </p>
          )}
        </div>

        <div style={{ ...fullSpanStyle, marginTop: adminTokens.spacing.sm }}>
          <button
            onClick={excluirProposta}
            style={{
              background: adminTokens.colors.error.background,
              color: adminTokens.colors.error.text,
              padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Excluir Proposta
          </button>
        </div>
      </div>
    </div>
  );
}
