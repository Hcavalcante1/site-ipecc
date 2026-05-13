"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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

function extrairMensagemPrincipal(mensagem?: string) {
  if (!mensagem) return "—";

  const linhas = mensagem
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(
      (l) =>
        !l.toLowerCase().startsWith("tipo de pessoa:") &&
        !l.toLowerCase().startsWith("categoria:") &&
        !l.toLowerCase().startsWith("anexos enviados:") &&
        !l.toLowerCase().startsWith("anexos complementares:")
    );

  return linhas.length ? linhas.join("\n") : "—";
}

function extrairResumoAnexos(mensagem?: string) {
  if (!mensagem) return [];

  const linha = mensagem
    .split("\n")
    .find(
      (item) =>
        item.trim().toLowerCase().startsWith("anexos enviados:") ||
        item.trim().toLowerCase().startsWith("anexos complementares:")
    );

  if (!linha) return [];

  const texto = linha
    .replace(/^anexos enviados:\s*/i, "")
    .replace(/^anexos complementares:\s*/i, "")
    .trim();

  if (!texto) return [];

  return texto
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [chave, ...resto] = item.split(":");
      return {
        chave: (chave || "").trim(),
        valor: resto.join(":").trim(),
      };
    });
}

function btn(bg: string, color: string) {
  return {
    background: bg,
    color,
    padding: "10px 18px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    lineHeight: 1.2,
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
        borderRadius: 18,
        padding: 22,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: 16,
          fontSize: 18,
          fontWeight: 700,
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
        color: "#e2e8f0",
      }}
    >
      <strong style={{ color: "#ffffff", fontWeight: 700 }}>{label}</strong>{" "}
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
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: palette.label,
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
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

  const resumoAnexos = useMemo(
    () => extrairResumoAnexos(proposta?.mensagem),
    [proposta?.mensagem]
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

  if (loading) return <p style={{ padding: 24 }}>Carregando...</p>;
  if (!proposta) return <p style={{ padding: 24 }}>Proposta não encontrada</p>;

  return (
    <div style={{ padding: 30 }}>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          background:
            "linear-gradient(180deg, rgba(16,63,124,0.92) 0%, rgba(2,6,23,0.98) 100%)",
          borderRadius: 28,
          padding: 36,
          color: "#e5e7eb",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.30)",
        }}
      >
        <div
          style={{
            marginBottom: 28,
            paddingBottom: 18,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h1
            style={{
              fontSize: 30,
              margin: 0,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            Detalhe da Proposta
          </h1>

          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              color: "#cbd5e1",
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
            gap: 20,
            alignItems: "start",
          }}
        >
          <InfoCard title="Dados da Proponente">
            <div style={{ display: "grid", gap: 12 }}>
              <LabelValue label="Nome:" value={proposta.nome || "—"} />
              <LabelValue label="Email:" value={proposta.email || "—"} />
              <LabelValue label="Telefone:" value={proposta.telefone || "—"} />
              <LabelValue label="Documento:" value={proposta.cnpj || "—"} />
            </div>
          </InfoCard>

          <InfoCard title="Classificação da Proposta">
            <div style={{ display: "grid", gap: 14 }}>
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
            gap: 20,
            marginTop: 20,
          }}
        >
          <InfoCard title="Mensagem Principal">
            <div
              style={{
                whiteSpace: "pre-line",
                lineHeight: 1.65,
                color: "#e2e8f0",
                fontSize: 15,
              }}
            >
              {mensagemPrincipal}
            </div>
          </InfoCard>

          <InfoCard title="Resumo dos Anexos Informados">
            {resumoAnexos.length === 0 ? (
              <span style={{ color: "#cbd5e1", fontSize: 14 }}>—</span>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {resumoAnexos.map((item, index) => (
                  <div
                    key={`${item.chave}-${index}`}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(148,163,184,0.10)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
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
                        color: "#e2e8f0",
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

        <div style={{ marginTop: 20 }}>
          <InfoCard title="Documentos Disponíveis para Download">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {downloads.length === 0 ? (
                <span style={{ color: "#cbd5e1", fontSize: 14 }}>
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
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <button
            onClick={excluirProposta}
            style={{
              background: "#ef4444",
              color: "#fff",
              padding: "12px 22px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: "0 8px 24px rgba(239,68,68,0.25)",
            }}
          >
            Excluir Proposta
          </button>
        </div>
      </div>
    </div>
  );
}