"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { adminTokens } from "@/components/admin";
import {
  type CertidaoEntidade,
  type CertidaoEntidadeLinha,
  COLUNA_URL_POR_CHAVE,
  CORES_STATUS_DOCUMENTAL,
  calcularDiagnosticoDocumental,
  extrairMensagemPrincipal,
  extrairResumoAnexos,
  formatarDataCertidao,
  labelCampoCertidao,
  montarChecklistDocumental,
  situacaoValidadeCertidao,
  somenteDigitosCnpj,
} from "@/lib/documental";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatarTipoPessoa(tipo?: string) {
  if (tipo === "pessoa_juridica") return "Pessoa Jurídica";
  if (tipo === "osc") return "OSC";
  if (tipo === "pessoa_fisica") return "Pessoa Física";
  if (tipo === "empresa") return "Pessoa Jurídica";
  if (tipo === "pf") return "Pessoa Física";
  return tipo || "—";
}

function formatarCategoria(categoria?: string | null, mensagem?: string) {
  if (mensagem) {
    const envioCompleto = mensagem
      .split("\n")
      .some((item) =>
        item.trim().toLowerCase().includes("envio completo com múltiplas categorias")
      );
    if (envioCompleto) {
      return "Envio completo (múltiplas categorias documentais)";
    }
  }

  if (categoria === "habilitacao_juridica") return "Habilitação Jurídica";
  if (categoria === "regularidade_fiscal_trabalhista") {
    return "Regularidade Fiscal e Trabalhista";
  }
  if (categoria === "qualificacao_tecnica") return "Qualificação Técnica";

  if (!mensagem) return "—";

  const linha = mensagem
    .split("\n")
    .find((item) => item.trim().toLowerCase().startsWith("categoria:"));

  if (!linha) return "—";

  return linha.replace(/^categoria:\s*/i, "").trim() || "—";
}

function ListaDiagnostico({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: string[];
  cor: string;
}) {
  if (itens.length === 0) return null;

  return (
    <div>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 13,
          fontWeight: adminTokens.typography.fontWeight.bold,
          color: cor,
        }}
      >
        {titulo}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: cor, lineHeight: 1.5 }}>
        {itens.map((item) => (
          <li key={item} style={{ marginBottom: 4 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

type CertidaoTipo = {
  id: string;
  codigo: string;
  nome: string;
};

const gap20 = adminTokens.spacing.base + adminTokens.spacing.sm;
const borderLight = `1px solid ${adminTokens.colors.border.light}`;

function btn(bg: string, color: string) {
  return {
    background: bg,
    color,
    padding: adminTokens.sizes.button.medium.padding,
    borderRadius: adminTokens.sizes.button.medium.borderRadius,
    textDecoration: "none",
    fontWeight: adminTokens.typography.fontWeight.bold,
    fontSize: adminTokens.sizes.button.medium.fontSize,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    lineHeight: adminTokens.typography.lineHeight.normal,
  } as React.CSSProperties;
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.78)",
        border: "1px solid rgba(148, 163, 184, 0.14)",
        borderRadius: adminTokens.borderRadius.md,
        padding: adminTokens.sizes.card.mainPadding,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: adminTokens.spacing.sm * 2,
          fontSize: 18,
          fontWeight: adminTokens.typography.fontWeight.bold,
          color: "#ffffff",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function LabelValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 15,
        lineHeight: 1.55,
        color: adminTokens.colors.text.secondary,
      }}
    >
      <strong
        style={{
          color: adminTokens.colors.text.primary,
          fontWeight: adminTokens.typography.fontWeight.bold,
        }}
      >
        {label}
      </strong>{" "}
      {value}
    </p>
  );
}

function BadgeCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue";
}) {
  const palette =
    tone === "green"
      ? {
          bg: "rgba(34,197,94,0.10)",
          border: "1px solid rgba(34,197,94,0.22)",
          label: "#86efac",
        }
      : {
          bg: "rgba(59,130,246,0.10)",
          border: "1px solid rgba(59,130,246,0.22)",
          label: "#93c5fd",
        };

  return (
    <div
      style={{
        background: palette.bg,
        border: palette.border,
        borderRadius: 16,
        padding: adminTokens.spacing.lg,
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: palette.label,
          marginBottom: adminTokens.spacing.sm,
          fontWeight: adminTokens.typography.fontWeight.bold,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: adminTokens.typography.fontWeight.bold,
          color: "#ffffff",
          lineHeight: 1.25,
        }}
      >
        {value}
      </div>
    </div>
  );
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
    async function carregar() {
      if (!id) return;

      const { data } = await supabase.from("propostas").select("*").eq("id", id);

      if (data && data.length > 0) {
        setProposta(data[0]);
      }

      setLoading(false);
    }

    carregar();
  }, [id]);

  const cnpjProposta = useMemo(
    () => somenteDigitosCnpj(proposta?.cnpj),
    [proposta?.cnpj]
  );

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

  const tipoPessoa = useMemo(
    () => formatarTipoPessoa(proposta?.tipo),
    [proposta?.tipo]
  );

  const categoria = useMemo(
    () => formatarCategoria(proposta?.categoria, proposta?.mensagem),
    [proposta?.categoria, proposta?.mensagem]
  );

  const mensagemPrincipal = useMemo(
    () => extrairMensagemPrincipal(proposta?.mensagem),
    [proposta?.mensagem]
  );

  const checklistDocumental = useMemo(
    () => montarChecklistDocumental(proposta, proposta?.mensagem),
    [proposta]
  );

  const totalItensChecklist = useMemo(
    () => checklistDocumental.reduce((acc, g) => acc + g.itens.length, 0),
    [checklistDocumental]
  );

  const resumoAnexos = useMemo(() => {
    const itensChecklist = checklistDocumental.flatMap((grupo) =>
      grupo.itens.map((item) => ({
        chave: item.key,
        valor: item.path || "—",
      }))
    );
    if (itensChecklist.length > 0) return itensChecklist;
    return extrairResumoAnexos(proposta?.mensagem);
  }, [checklistDocumental, proposta?.mensagem]);

  const diagnosticoDocumental = useMemo(
    () =>
      calcularDiagnosticoDocumental(
        proposta,
        proposta?.tipo,
        checklistDocumental,
        certidoesEntidade,
        cnpjProposta
      ),
    [proposta, checklistDocumental, certidoesEntidade, cnpjProposta]
  );

  const downloads = useMemo(() => {
    if (!proposta) return [];

    return [
      { label: "Proposta", path: proposta.arquivo_url, bg: "#22c55e", color: "#022c22" },
      { label: "CNPJ", path: proposta.cnpj_url, bg: "#3b82f6", color: "#fff" },
      { label: "Contrato Social", path: proposta.contrato_social_url, bg: "#a855f7", color: "#fff" },
      { label: "Estatuto", path: proposta.estatuto_url, bg: "#eab308", color: "#111827" },
      { label: "Ata e Posse", path: proposta.ata_posse_url, bg: "#8b5cf6", color: "#fff" },
      { label: "Documento Pessoal", path: proposta.doc_pessoal_url, bg: "#f97316", color: "#fff" },
      { label: "Documento Representante", path: proposta.doc_representante_url, bg: "#06b6d4", color: "#06283D" },
      { label: "Procuração", path: proposta.procuracao_url, bg: "#14b8a6", color: "#052e2b" },
      { label: "Certidão Federal", path: proposta.certidao_federal_url, bg: "#2563eb", color: "#fff" },
      { label: "Certidão Estadual", path: proposta.certidao_estadual_url, bg: "#4f46e5", color: "#fff" },
      { label: "Certidão Municipal", path: proposta.certidao_municipal_url, bg: "#7c3aed", color: "#fff" },
      { label: "FGTS", path: proposta.fgts_url, bg: "#16a34a", color: "#fff" },
      { label: "CNDT", path: proposta.cndt_url, bg: "#dc2626", color: "#fff" },
      { label: "Atestado Técnico", path: proposta.atestado_tecnico_url, bg: "#0891b2", color: "#fff" },
      { label: "Qualificação Técnica", path: proposta.qualificacao_tecnica_url, bg: "#0f766e", color: "#fff" },
      { label: "Equipe Técnica", path: proposta.equipe_tecnica_url, bg: "#1d4ed8", color: "#fff" },
      { label: "Portfólio", path: proposta.portfolio_url, bg: "#9333ea", color: "#fff" },
      { label: "Formação", path: proposta.formacao_url, bg: "#ea580c", color: "#fff" },
      { label: "Registro Profissional", path: proposta.registro_profissional_url, bg: "#475569", color: "#fff" },
      { label: "Comprovante de Residência", path: proposta.comprovante_residencia_url, bg: "#0ea5e9", color: "#fff" },
      { label: "CPF", path: proposta.cpf_url, bg: "#64748b", color: "#fff" },
    ].filter((item) => !!item.path);
  }, [proposta]);

  if (loading)
    return (
      <p style={{ padding: adminTokens.spacing.xxxl }}>Carregando...</p>
    );
  if (!proposta)
    return (
      <p style={{ padding: adminTokens.spacing.xxxl }}>Proposta não encontrada</p>
    );

  return (
    <div
      style={{
        padding: adminTokens.spacing.base + adminTokens.spacing.xl,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          background:
            "linear-gradient(180deg, rgba(16,63,124,0.92) 0%, rgba(2,6,23,0.98) 100%)",
          borderRadius: 28,
          padding: adminTokens.spacing.xxxl + adminTokens.spacing.base,
          color: "#e5e7eb",
          border: borderLight,
          boxShadow: "0 20px 60px rgba(0,0,0,0.30)",
        }}
      >
        <div
          style={{
            marginBottom: adminTokens.spacing.xl + adminTokens.spacing.md,
            paddingBottom: adminTokens.spacing.xl,
            borderBottom: borderLight,
          }}
        >
          <h1
            style={{
              fontSize: 30,
              margin: 0,
              fontWeight: adminTokens.typography.fontWeight.bold,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            Detalhe da Proposta
          </h1>

          <p
            style={{
              marginTop: adminTokens.spacing.md,
              marginBottom: 0,
              color: adminTokens.colors.text.muted,
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            Visualização completa dos dados enviados, com separação por tipo,
            categoria e anexos.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: gap20,
            alignItems: "start",
          }}
        >
          <InfoCard title="Dados da Proponente">
            <div style={{ display: "grid", gap: adminTokens.spacing.base }}>
              <LabelValue label="Nome:" value={proposta.nome || "—"} />
              <LabelValue label="Email:" value={proposta.email || "—"} />
              <LabelValue label="Telefone:" value={proposta.telefone || "—"} />
              <LabelValue label="Documento:" value={proposta.cnpj || "—"} />
            </div>
          </InfoCard>

          <InfoCard title="Classificação da Proposta">
            <div style={{ display: "grid", gap: adminTokens.spacing.lg }}>
              <BadgeCard
                label="Tipo de Pessoa"
                value={tipoPessoa}
                tone="green"
              />
              <BadgeCard
                label="Categoria"
                value={categoria}
                tone="blue"
              />
            </div>
          </InfoCard>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: gap20,
            marginTop: gap20,
          }}
        >
          <InfoCard title="Mensagem Principal">
            <div
              style={{
                whiteSpace: "pre-line",
                lineHeight: 1.65,
                color: adminTokens.colors.text.secondary,
                fontSize: 15,
              }}
            >
              {mensagemPrincipal}
            </div>
          </InfoCard>

          <InfoCard title="Resumo dos Anexos Informados">
            {resumoAnexos.length === 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                —
              </span>
            ) : (
              <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
                {resumoAnexos.map((item, index) => (
                  <div
                    key={`${item.chave}-${index}`}
                    style={{
                      padding: adminTokens.sizes.input.padding,
                      borderRadius: adminTokens.borderRadius.sm,
                      background: adminTokens.colors.surface.subtle,
                      border: "1px solid rgba(148,163,184,0.10)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: adminTokens.typography.fontWeight.bold,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#93c5fd",
                        marginBottom: 4,
                      }}
                    >
                      {item.chave || "Anexo"}
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.55,
                        color: adminTokens.colors.text.secondary,
                        wordBreak: "break-word",
                      }}
                    >
                      {item.valor || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InfoCard>
        </div>

        <div style={{ marginTop: gap20 }}>
          <InfoCard title="Status documental (sugestão automática)">
            <p
              style={{
                marginTop: 0,
                marginBottom: adminTokens.spacing.base,
                color: adminTokens.colors.text.muted,
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              Status sugerido automaticamente. A decisão final cabe ao analista
              responsável.
            </p>
            <div
              style={{
                ...CORES_STATUS_DOCUMENTAL[diagnosticoDocumental.status],
                borderRadius: 16,
                padding: adminTokens.spacing.lg,
                marginBottom: adminTokens.spacing.lg,
                border: CORES_STATUS_DOCUMENTAL[diagnosticoDocumental.status].border,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: adminTokens.spacing.sm,
                  opacity: 0.9,
                }}
              >
                Status sugerido
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: adminTokens.typography.fontWeight.bold,
                  lineHeight: 1.25,
                }}
              >
                {diagnosticoDocumental.statusLabel}
              </div>
            </div>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: 15,
                color: adminTokens.colors.text.secondary,
              }}
            >
              Núcleo documental: {diagnosticoDocumental.nucleoEncontrados}/
              {diagnosticoDocumental.nucleoTotal}
            </p>
            <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
              <ListaDiagnostico
                titulo="Documentos do núcleo encontrados"
                itens={diagnosticoDocumental.listaVerde}
                cor="#86efac"
              />
              <ListaDiagnostico
                titulo="Documentos condicionais ausentes"
                itens={diagnosticoDocumental.listaLaranja}
                cor="#fbbf24"
              />
              <ListaDiagnostico
                titulo="Pendências graves"
                itens={diagnosticoDocumental.listaVermelha}
                cor="#fca5a5"
              />
              <ListaDiagnostico
                titulo="Alertas de certidões (cadastro institucional)"
                itens={diagnosticoDocumental.alertasCertidoes}
                cor="#fdba74"
              />
            </div>
          </InfoCard>
        </div>

        <div style={{ marginTop: gap20 }}>
          <InfoCard title="Checklist documental da proposta">
            <p
              style={{
                marginTop: 0,
                marginBottom: adminTokens.spacing.base,
                color: adminTokens.colors.text.muted,
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              Checklist gerado a partir dos anexos informados no envio da proposta.
            </p>
            {totalItensChecklist === 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Nenhum anexo identificado na mensagem ou nas colunas da proposta.
              </span>
            ) : (
              <div style={{ display: "grid", gap: adminTokens.spacing.lg }}>
                {checklistDocumental.map((grupo) =>
                  grupo.itens.length === 0 ? null : (
                    <div key={grupo.id} style={{ marginBottom: adminTokens.spacing.lg }}>
                      <h4
                        style={{
                          margin: "0 0 10px",
                          fontSize: 15,
                          fontWeight: adminTokens.typography.fontWeight.bold,
                          color: "#93c5fd",
                        }}
                      >
                        {grupo.titulo}
                      </h4>
                      <div style={{ display: "grid", gap: adminTokens.spacing.sm }}>
                        {grupo.itens.map((item) => {
                          const href = item.path ? url(item.path) : null;
                          const coluna = COLUNA_URL_POR_CHAVE[item.key];
                          const temColuna =
                            !!coluna &&
                            typeof proposta?.[coluna] === "string" &&
                            !!(proposta[coluna] as string).trim();

                          return (
                            <div
                              key={item.key}
                              style={{
                                padding: adminTokens.sizes.input.padding,
                                borderRadius: adminTokens.borderRadius.sm,
                                background: adminTokens.colors.surface.subtle,
                                border: "1px solid rgba(148,163,184,0.10)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: adminTokens.typography.fontWeight.bold,
                                  color: "#ffffff",
                                  lineHeight: 1.4,
                                }}
                              >
                                {item.label}
                              </div>
                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 13,
                                  color: adminTokens.colors.text.muted,
                                  wordBreak: "break-word",
                                }}
                              >
                                {item.path ? (
                                  <>
                                    <span style={{ display: "block", marginBottom: 6 }}>
                                      Arquivo: {item.path}
                                    </span>
                                    {href && temColuna ? (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          ...btn("#22c55e", "#052e16"),
                                          fontSize: 13,
                                          padding: "6px 12px",
                                        }}
                                      >
                                        Baixar documento
                                      </a>
                                    ) : (
                                      <span>
                                        Registrado na mensagem do envio (sem coluna
                                        dedicada para download automático).
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span>—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </InfoCard>
        </div>

        <div style={{ marginTop: gap20 }}>
          <InfoCard title="Regularidade fiscal da entidade">
            {carregandoCertidoes ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Carregando certidões...
              </span>
            ) : cnpjProposta.length !== 14 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                CNPJ da proposta inválido ou não informado.
              </span>
            ) : certidoesEntidade.length === 0 ? (
              <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                Nenhuma certidão cadastrada para esta entidade.
              </span>
            ) : (
              <>
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: adminTokens.spacing.base,
                    color: adminTokens.colors.text.muted,
                    fontSize: 14,
                  }}
                >
                  CNPJ consultado: {cnpjProposta}
                </p>
                <div style={{ display: "grid", gap: adminTokens.spacing.md }}>
                  {certidoesEntidade.map((item) => {
                    const validade = situacaoValidadeCertidao(item.validade_ate);
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: adminTokens.sizes.input.padding,
                          borderRadius: adminTokens.borderRadius.sm,
                          background: adminTokens.colors.surface.subtle,
                          border: "1px solid rgba(148,163,184,0.10)",
                        }}
                      >
                        <strong style={{ color: "#fff", fontSize: 15 }}>
                          {item.tipo_nome}
                        </strong>
                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            marginTop: adminTokens.spacing.sm,
                            fontSize: 14,
                            color: adminTokens.colors.text.secondary,
                          }}
                        >
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Órgão emissor:
                            </strong>{" "}
                            {item.orgao_emissor}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Esfera:
                            </strong>{" "}
                            {labelCampoCertidao(item.esfera)}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Status:
                            </strong>{" "}
                            {labelCampoCertidao(item.status)}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Validade:
                            </strong>{" "}
                            {formatarDataCertidao(item.validade_ate)}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Versão:
                            </strong>{" "}
                            v{item.versao}
                          </span>
                          <span>
                            <strong style={{ color: adminTokens.colors.text.primary }}>
                              Situação:
                            </strong>{" "}
                            <span style={{ color: validade.cor, fontWeight: 600 }}>
                              {validade.texto}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </InfoCard>
        </div>

        <div style={{ marginTop: gap20 }}>
          <InfoCard title="Documentos Disponíveis para Download">
            <div style={{ display: "flex", gap: adminTokens.spacing.base, flexWrap: "wrap" }}>
              {downloads.length === 0 ? (
                <span style={{ color: adminTokens.colors.text.muted, fontSize: 14 }}>
                  Nenhum documento disponível para download.
                </span>
              ) : (
                downloads.map((item) => (
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
          </InfoCard>
        </div>

        <div
          style={{
            marginTop: adminTokens.spacing.xxxl,
            paddingTop: gap20,
            borderTop: borderLight,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <button
            onClick={excluirProposta}
            style={{
              background: adminTokens.colors.error.background,
              color: adminTokens.colors.error.text,
              padding: `${adminTokens.spacing.base}px ${adminTokens.spacing.xxl}px`,
              borderRadius: adminTokens.borderRadius.full,
              border: "none",
              cursor: "pointer",
              fontWeight: adminTokens.typography.fontWeight.bold,
              fontSize: adminTokens.sizes.button.medium.fontSize,
              boxShadow: adminTokens.shadows.buttonRed,
            }}
          >
            Excluir Proposta
          </button>
        </div>
      </div>
    </div>
  );
}