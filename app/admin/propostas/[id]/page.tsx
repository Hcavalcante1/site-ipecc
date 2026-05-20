"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { adminTokens } from "@/components/admin";
import {
  BadgeCard,
  btn,
  ChecklistDocumentalProposta,
  gap20,
  InfoCard,
  LabelValue,
  PainelStatusDocumental,
  RegularidadeFiscalEntidade,
  ResumoAnexosInformados,
} from "@/components/admin/propostas/detail";
import { usePropostaDocumental } from "@/components/admin/propostas/usePropostaDocumental";
import {
  type CertidaoEntidade,
  type CertidaoEntidadeLinha,
} from "@/lib/documental";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CertidaoTipo = {
  id: string;
  codigo: string;
  nome: string;
};

const borderLight = `1px solid ${adminTokens.colors.border.light}`;

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

          <ResumoAnexosInformados itens={resumoAnexos} />
        </div>

        <div style={{ marginTop: gap20 }}>
          <PainelStatusDocumental diagnostico={diagnosticoDocumental} />
        </div>

        <div style={{ marginTop: gap20 }}>
          <ChecklistDocumentalProposta
            checklist={checklistDocumental}
            totalItens={totalItensChecklist}
            proposta={proposta}
            url={url}
          />
        </div>

        <div style={{ marginTop: gap20 }}>
          <RegularidadeFiscalEntidade
            carregando={carregandoCertidoes}
            cnpjDigitos={cnpjProposta}
            certidoes={certidoesEntidade}
          />
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