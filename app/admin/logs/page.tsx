"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { spacing, borderRadius, typography, colors } from "@/components/admin";
import { labelAcaoAdmin } from "@/lib/admin/acaoLabel";

type Log = {
  id: string;
  user_email: string;
  acao: string;
  tabela: string;
  detalhes: any;
  created_at: string;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const [acao, setAcao] = useState("");
  const [tabela, setTabela] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [acao, tabela, busca]);

  async function fetchLogs() {
    setLoading(true);

    let query = supabase
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (acao) query = query.eq("acao", acao);
    if (tabela) query = query.eq("tabela", tabela);
    if (busca) query = query.ilike("user_email", `%${busca}%`);

    const { data, error } = await query;

    if (!error && data) {
      setLogs(data);
    }

    setLoading(false);
  }

  function getColor(acao: string) {
    if (acao === "INSERT") return "#22c55e";
    if (acao === "UPDATE") return "#38bdf8";
    if (acao === "DELETE") return "#ef4444";
    return "#94a3b8";
  }

  function exportCSV() {
    if (logs.length === 0) return;

    const header = ["E-mail", "Ação", "Tabela", "Data"];

    const rows = logs.map((log) => [
      log.user_email,
      labelAcaoAdmin(log.acao),
      log.tabela,
      new Date(log.created_at).toLocaleString("pt-BR"),
    ]);

    const csvContent =
      [header, ...rows]
        .map((e) => e.join(";"))
        .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "logs_admin.csv");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>Registros do sistema</h1>
      <p style={styles.subtitle}>
        Consulte os registros de operacao do admin para auditoria, revisao de
        alteracoes e investigacao de falhas. Esta tela e somente de consulta e
        exportacao.
      </p>

      <button onClick={exportCSV} style={styles.exportBtn}>
        Exportar CSV
      </button>

      {/* FILTROS */}
      <div style={styles.filters}>
        <select value={acao} onChange={(e) => setAcao(e.target.value)}>
          <option value="">Todas as acoes</option>
          <option value="INSERT">Inclusao</option>
          <option value="UPDATE">Atualizacao</option>
          <option value="DELETE">Exclusao</option>
        </select>

        <input
          placeholder="Filtrar por tabela"
          value={tabela}
          onChange={(e) => setTabela(e.target.value)}
        />

        <input
          placeholder="Buscar por usuário"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {loading && <p style={styles.loading}>Carregando...</p>}

      {!loading && logs.length === 0 && (
        <p style={styles.empty}>Nenhum log encontrado.</p>
      )}

      <div style={styles.table}>
        {logs.map((log) => (
          <div key={log.id} style={styles.row}>
            <div style={styles.header}>
              <span style={{ ...styles.badge, background: getColor(log.acao) }}>
                {labelAcaoAdmin(log.acao)}
              </span>

              <span style={styles.tabela}>{log.tabela}</span>
            </div>

            <div style={styles.info}>
              <strong>{log.user_email}</strong>
              <span>
                {new Date(log.created_at).toLocaleString("pt-BR")}
              </span>
            </div>

            {log.detalhes && (
              <pre style={styles.details}>
                {JSON.stringify(log.detalhes, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== ESTILO ===== */

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    padding: spacing.xxxl,
    color: colors.text.light,
  },

  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },

  subtitle: {
    color: colors.text.secondary,
    maxWidth: 820,
    marginTop: 0,
    marginBottom: spacing.md,
  },

  exportBtn: {
    marginBottom: spacing.lg,
    padding: "8px 16px",
    borderRadius: borderRadius.full,
    border: "none",
    background: colors.success.background,
    color: colors.success.text,
    fontWeight: typography.fontWeight.normal,
    cursor: "pointer",
  },

  filters: {
    display: "flex",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  loading: {
    color: colors.text.secondary,
  },

  empty: {
    color: colors.text.muted,
  },

  table: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.lg,
  },

  row: {
    background: colors.background.darkest,
    border: `1px solid ${colors.border.medium}`,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },

  badge: {
    padding: "4px 10px",
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },

  tabela: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },

  info: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },

  details: {
    background: colors.background.darkest,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    overflowX: "auto",
  },
};
