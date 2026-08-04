"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminTokens } from "@/components/admin";
import { supabase } from "@/lib/supabaseClient";
import { triggerToast } from "@/components/AdminToast";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import {
  getRotuloVinculoProposta,
  getUrlConsultaEditalAdmin,
  isEditalFaseRascunho,
  propostaTemVinculoOficial,
} from "@/lib/editais/governancaRules";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";
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
  const escopo = useAdminEscopoCliente();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [proposta, setProposta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [foraEscopo, setForaEscopo] = useState(false);
  const [certidoesEntidade, setCertidoesEntidade] = useState<CertidaoEntidadeLinha[]>(
    []
  );
  const [carregandoCertidoes, setCarregandoCertidoes] = useState(false);

  useEffect(() => {
    if (escopo.loading) return;
    void carregarProposta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, escopo.loading, escopo.processoIds]);

  async function carregarProposta() {
    if (!id) return;

    setLoading(true);
    setForaEscopo(false);
    const { data } = await supabase
      .from("propostas")
      .select("*, editais(titulo, periodo, periodo_envio, fase_atual, tipo, processo_id)")
      .eq("id", id);

    if (data && data.length > 0) {
      const row = data[0] as {
        editais?:
          | { processo_id?: string | null }
          | { processo_id?: string | null }[]
          | null;
      };
      const edital = Array.isArray(row.editais) ? row.editais[0] : row.editais;
      if (!registroNoEscopoProcesso(edital?.processo_id, escopo.processoIds)) {
        setForaEscopo(true);
        setProposta(null);
      } else {
        setProposta(data[0]);
      }
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
    if (!id) return;
    const okExcluir = await confirmAction("Deseja excluir esta proposta?");
    if (!okExcluir) {
      if (!isConfirmModalReady() && !window.confirm("Deseja excluir esta proposta?")) return;
      else if (isConfirmModalReady()) return;
    }

    // Exclusao real via service role (client RLS pode "suceder" sem apagar nenhuma linha).
    const res = await fetch("/api/admin/mutate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "propostas",
        action: "delete",
        filters: [{ column: "id", value: id }],
        select: "id",
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!res.ok || !json.ok) {
      triggerToast(
        `Erro ao excluir proposta: ${json.error || "falha na exclusão"}`,
        "error"
      );
      return;
    }

    triggerToast("Proposta excluida com sucesso.", "success");
    router.push("/admin/propostas");
    router.refresh();
  }

  async function atualizarStatus(status: "aprovado" | "rejeitado") {
    if (!id) return;

    const { error } = await supabase
      .from("propostas")
      .update({ status })
      .eq("id", id);

    if (error) {
      triggerToast("Erro ao atualizar status da proposta.", "error");
      return;
    }

    triggerToast(
      status === "aprovado" ? "Proposta aprovada." : "Proposta rejeitada.",
      "success"
    );

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
        triggerToast(
          ponte.message || "Rascunho de convenio criado na Transparencia.",
          "success"
        );
      } else if (ponte?.error) {
        triggerToast(
          `Proposta aprovada, mas a ponte falhou: ${ponte.error}`,
          "error"
        );
      }
    }

    await carregarProposta();
  }

  function url(caminho: string | null) {
    if (!caminho) return null;

    return `/api/download/public/propostas/${caminho}`;
  }

  if (loading || escopo.loading)
    return (
      <p style={{ padding: adminTokens.spacing.xxxl }}>Carregando...</p>
    );
  if (foraEscopo)
    return (
      <div style={shellStyle}>
        <p>Acesso negado — proposta fora do seu escopo de processo.</p>
        <button
          type="button"
          style={btn("#1e293b", "#fff")}
          onClick={() => router.push("/admin/propostas")}
        >
          Voltar
        </button>
      </div>
    );
  if (!proposta)
    return (
      <p style={{ padding: adminTokens.spacing.xxxl }}>Proposta não encontrada</p>
    );

  const editalRelacionado = Array.isArray(proposta.editais)
    ? proposta.editais[0]
    : proposta.editais;
  const urlConsultaEdital =
    proposta.edital_id &&
    getUrlConsultaEditalAdmin(proposta.edital_id, editalRelacionado);
  const abreEditalNovaAba = urlConsultaEdital?.startsWith("/editais/");

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
          {proposta.edital_id && urlConsultaEdital && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: adminTokens.spacing.sm,
                marginTop: adminTokens.spacing.md,
              }}
            >
              <a
                href={urlConsultaEdital}
                target={abreEditalNovaAba ? "_blank" : undefined}
                rel={abreEditalNovaAba ? "noopener noreferrer" : undefined}
                style={{
                  ...btn("#0ea5e9", "#fff"),
                  textDecoration: "none",
                }}
              >
                {isEditalFaseRascunho(editalRelacionado?.fase_atual)
                  ? "Ver edital (governanca / teste)"
                  : "Ver edital (público)"}
              </a>
              <a
                href={`/admin/editais/${proposta.edital_id}/governanca`}
                style={{
                  ...btn("#334155", "#e2e8f0"),
                  textDecoration: "none",
                }}
              >
                Governanca do edital
              </a>
            </div>
          )}
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
            <strong>E-mail:</strong> {proposta.email || "—"}
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
          <p style={tightParaStyle}>
            <strong>Edital vinculado:</strong>{" "}
            {editalRelacionado?.titulo || "sem vínculo"}
          </p>
          <p style={tightParaStyle}>
            <strong>Modalidade:</strong>{" "}
            {editalRelacionado?.tipo?.trim() || "—"}
          </p>
          <p style={tightParaStyle}>
            <strong>Tipo de vinculo:</strong>{" "}
            <span
              style={{
                color: propostaTemVinculoOficial(proposta.status)
                  ? adminTokens.colors.success.background
                  : adminTokens.colors.text.muted,
                fontWeight: adminTokens.typography.fontWeight.bold,
              }}
            >
              {getRotuloVinculoProposta(proposta.status)}
            </span>
          </p>
          {propostaTemVinculoOficial(proposta.status) ? (
            <p style={{ marginTop: 10, marginBottom: 0 }}>
              <a
                href="/admin/paginas/transparencia/convenios"
                style={{ color: "#93c5fd", fontWeight: 700 }}
              >
                Abrir rascunhos de convenio na Transparencia
              </a>
            </p>
          ) : null}
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
          <strong style={sectionTitleStyle}>Arquivos para download</strong>
          <div
            style={{
              display: "flex",
              gap: adminTokens.spacing.md,
              flexWrap: "wrap",
            }}
          >
            {verificandoDownloads && downloads.length > 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Verificando anexos no armazenamento…
              </span>
            ) : downloadsDisponiveis.length === 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Nenhum documento disponível para baixar.
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
              Sem arquivo no armazenamento:{" "}
              {downloadsOrfaos.map((o) => `${o.label} (${o.path})`).join("; ")}
            </p>
          )}
        </div>

        <div style={{ ...fullSpanStyle, marginTop: adminTokens.spacing.sm }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: adminTokens.spacing.md,
            }}
          >
            <button
              type="button"
              onClick={() => atualizarStatus("aprovado")}
              style={{
                background: adminTokens.colors.success.background,
                color: "#022c22",
                padding: `${adminTokens.spacing.xs}px ${adminTokens.spacing.base}px`,
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
              onClick={() => atualizarStatus("rejeitado")}
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
              Rejeitar
            </button>
            <button
              type="button"
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
    </div>
  );
}
