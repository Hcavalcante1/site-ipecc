"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { spacing, typography, colors } from "@/components/admin";

type CertidaoTipo = {
  id: string;
  codigo: string;
  nome: string;
};

type Certidao = {
  id: string;
  organizacao_cnpj: string;
  tipo_id: string;
  orgao_emissor: string;
  esfera: string;
  validade_ate: string;
  status: string;
  versao: number;
  certidao_anterior_id: string | null;
};

type CertidaoLinha = Certidao & {
  tipo_nome: string;
  tipo_codigo: string;
};

function formatarCnpj(cnpj: string) {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function formatarData(iso: string) {
  const date = new Date(iso + "T12:00:00");
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR");
}

function diasAteValidade(validadeAte: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(validadeAte + "T12:00:00");
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function labelEsfera(esfera: string) {
  return esfera.replace(/_/g, " ");
}

function corStatus(status: string): string {
  switch (status) {
    case "regular":
      return "#22c55e";
    case "irregular":
    case "positiva":
    case "positiva_com_efeito_negativa":
      return "#ef4444";
    case "vencida":
      return "#f97316";
    case "pendente":
    case "exige_acao_humana":
      return "#eab308";
    case "erro_emissao":
      return "#94a3b8";
    default:
      return "#94a3b8";
  }
}

function labelStatus(status: string) {
  return status.replace(/_/g, " ");
}

const POR_PAGINA = 50;

function filtrarVersoesCorrentes(lista: Certidao[]): Certidao[] {
  const idsComSucessor = new Set(
    lista
      .map((item) => item.certidao_anterior_id)
      .filter((id): id is string => Boolean(id))
  );
  return lista.filter((item) => !idsComSucessor.has(item.id));
}

export default function CertidoesAdminPage() {
  const [linhas, setLinhas] = useState<CertidaoLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "vencidas" | "vencendo7">("todos");
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    setErro(null);

    const [tiposRes, certidoesRes] = await Promise.all([
      supabase
        .from("certidao_tipos")
        .select("id, codigo, nome")
        .eq("ativo", true)
        .order("ordem_exibicao", { ascending: true }),
      supabase
        .from("certidoes")
        .select(
          "id, organizacao_cnpj, tipo_id, orgao_emissor, esfera, validade_ate, status, versao, certidao_anterior_id"
        )
        .order("validade_ate", { ascending: true }),
    ]);

    if (tiposRes.error || certidoesRes.error) {
      setErro(
        tiposRes.error?.message ||
          certidoesRes.error?.message ||
          "Erro ao carregar certidões."
      );
      setLinhas([]);
      setLoading(false);
      return;
    }

    const tiposMap = new Map<string, CertidaoTipo>();
    (tiposRes.data || []).forEach((tipo) => {
      tiposMap.set(tipo.id, tipo);
    });

    const correntes = filtrarVersoesCorrentes((certidoesRes.data || []) as Certidao[]);

    const montadas: CertidaoLinha[] = correntes.map((item) => {
      const tipo = tiposMap.get(item.tipo_id);
      return {
        ...item,
        tipo_nome: tipo?.nome ?? "—",
        tipo_codigo: tipo?.codigo ?? "—",
      };
    });

    setLinhas(montadas);
    setLoading(false);
  }

  const resumo = useMemo(() => {
    let vencidas = 0;
    let vencendo7 = 0;
    linhas.forEach((item) => {
      const dias = diasAteValidade(item.validade_ate);
      if (dias < 0) vencidas += 1;
      else if (dias <= 7) vencendo7 += 1;
    });
    return { total: linhas.length, vencidas, vencendo7 };
  }, [linhas]);

  const linhasFiltradas = useMemo(() => {
    if (filtro === "vencidas") return linhas.filter((item) => diasAteValidade(item.validade_ate) < 0);
    if (filtro === "vencendo7") return linhas.filter((item) => { const d = diasAteValidade(item.validade_ate); return d >= 0 && d <= 7; });
    return linhas;
  }, [linhas, filtro]);

  const linhasPaginadas = linhasFiltradas.slice(0, (pagina + 1) * POR_PAGINA);
  const temMais = linhasFiltradas.length > linhasPaginadas.length;

  return (
    <>
      <h1 className="admin-h1">Certidões e Regularidade Fiscal</h1>
      <p className="admin-subtitle">
        Controle manual das certidoes usadas na analise de propostas,
        convenios e prestacao de contas. Mantenha apenas as versoes correntes
        visiveis para apoiar a decisao administrativa.
      </p>

      <div className="admin-save-row" style={{ marginTop: 0 }}>
        <Link href="/admin/certidoes/nova" className="admin-save-button" style={styles.novaLink}>
          Nova certidão
        </Link>
      </div>

      {!loading && !erro && linhas.length > 0 && (
        <div style={styles.statsRow}>
          {[
            { key: "todos" as const, label: "Total", value: resumo.total, color: "#93c5fd" },
            { key: "vencendo7" as const, label: "Vencendo em 7 dias", value: resumo.vencendo7, color: "#fde047" },
            { key: "vencidas" as const, label: "Vencidas", value: resumo.vencidas, color: "#f97316" },
          ].map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => { setFiltro(filtro === card.key && card.key !== "todos" ? "todos" : card.key); setPagina(0); }}
              style={{
                ...styles.statCard,
                borderColor: filtro === card.key ? card.color : `${card.color}44`,
                background: filtro === card.key ? `${card.color}18` : "rgba(15,23,42,0.6)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 24, fontWeight: 900, color: card.color }}>{card.value}</span>
              <span style={styles.statLabel}>{card.label}</span>
            </button>
          ))}
        </div>
      )}

      {loading && <p style={styles.loading}>Carregando certidões...</p>}

      {erro && <p style={styles.erro}>{erro}</p>}

      {!loading && !erro && linhas.length === 0 && (
        <p style={styles.empty}>
          Nenhuma certidão cadastrada. Use &quot;Nova certidão&quot; para incluir
          o primeiro registro.
        </p>
      )}

      {!loading && !erro && linhas.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>CNPJ</th>
                <th style={styles.th}>Órgão emissor</th>
                <th style={styles.th}>Esfera</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Validade</th>
                <th style={styles.th}>Versão</th>
              </tr>
            </thead>
            <tbody>
              {linhasPaginadas.map((item) => {
                const dias = diasAteValidade(item.validade_ate);
                return (
                  <tr key={item.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{item.tipo_nome}</strong>
                      <div style={styles.muted}>{item.tipo_codigo}</div>
                    </td>
                    <td style={styles.td}>{formatarCnpj(item.organizacao_cnpj)}</td>
                    <td style={styles.td}>{item.orgao_emissor}</td>
                    <td style={styles.td}>{labelEsfera(item.esfera)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background: corStatus(item.status),
                        }}
                      >
                        {labelStatus(item.status)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {formatarData(item.validade_ate)}
                      <span
                        style={{
                          ...styles.validadeHint,
                          color:
                            dias < 0
                              ? "#f97316"
                              : dias <= 7
                                ? "#eab308"
                                : "#94a3b8",
                        }}
                      >
                        {dias < 0
                          ? `Vencida há ${Math.abs(dias)} dia(s)`
                          : dias === 0
                            ? "Vence hoje"
                            : `${dias} dia(s) restante(s)`}
                      </span>
                    </td>
                    <td style={styles.td}>v{item.versao}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !erro && temMais && (
        <button
          type="button"
          onClick={() => setPagina((p) => p + 1)}
          style={styles.btnCarregarMais}
        >
          Carregar mais ({linhasFiltradas.length - linhasPaginadas.length} restantes)
        </button>
      )}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  novaLink: {
    display: "inline-block",
    textDecoration: "none",
    textAlign: "center",
  },
  statsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "12px 18px",
    borderRadius: 12,
    border: "1px solid",
    minWidth: 120,
    textAlign: "left",
    background: "rgba(15,23,42,0.6)",
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  loading: {
    marginTop: spacing.lg,
    color: colors.text.secondary,
  },
  erro: {
    marginTop: spacing.lg,
    color: colors.error.text,
  },
  empty: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: 12,
    background: "rgba(15, 23, 42, 0.5)",
    color: colors.text.secondary,
  },
  tableWrap: {
    marginTop: spacing.md,
    overflowX: "auto",
  },
  btnCarregarMais: {
    marginTop: spacing.md,
    padding: "10px 20px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.3)",
    background: "rgba(15,23,42,0.85)",
    color: colors.text.light,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: typography.fontSize.sm,
  },
  th: {
    textAlign: "left",
    padding: `${spacing.sm}px ${spacing.base}px`,
    borderBottom: `1px solid ${colors.border.light}`,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.bold,
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: `1px solid ${colors.border.light}`,
  },
  td: {
    padding: `${spacing.md}px ${spacing.base}px`,
    verticalAlign: "top",
    color: colors.text.light,
  },
  muted: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 4,
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: "#0f172a",
    textTransform: "capitalize",
  },
  validadeHint: {
    display: "block",
    fontSize: typography.fontSize.xs,
    marginTop: 4,
  },
};
