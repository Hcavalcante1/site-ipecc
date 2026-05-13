"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { spacing, borderRadius, typography, colors } from "@/components/admin";

type Log = {
  id: string;
  user_email: string;
  acao: "INSERT" | "UPDATE" | "DELETE" | string;
  tabela: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("admin_logs")
      .select("id,user_email,acao,tabela,created_at")
      .order("created_at", { ascending: false })
      .limit(500); // amostra recente

    if (!error && data) setLogs(data as Log[]);

    setLoading(false);
  }

  // ===== MÉTRICAS =====

  const metrics = useMemo(() => {
    const total = logs.length;

    let insert = 0;
    let update = 0;
    let del = 0;

    const byTable: Record<string, number> = {};

    logs.forEach((l) => {
      if (l.acao === "INSERT") insert++;
      else if (l.acao === "UPDATE") update++;
      else if (l.acao === "DELETE") del++;

      byTable[l.tabela] = (byTable[l.tabela] || 0) + 1;
    });

    const tables = Object.entries(byTable)
      .map(([tabela, count]) => ({ tabela, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // top 6

    return { total, insert, update, del, tables };
  }, [logs]);

  if (loading) {
    return <div style={styles.wrapper}>Carregando métricas...</div>;
  }

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>Dashboard do Admin</h1>

      {/* CARDS */}
      <div style={styles.cards}>
        <Card label="Total de Ações" value={metrics.total} />
        <Card label="INSERT" value={metrics.insert} color="#22c55e" />
        <Card label="UPDATE" value={metrics.update} color="#38bdf8" />
        <Card label="DELETE" value={metrics.del} color="#ef4444" />
      </div>

      {/* TABELAS MAIS ALTERADAS */}
      <div style={styles.block}>
        <h2 style={styles.subtitle}>Tabelas mais alteradas</h2>

        {metrics.tables.length === 0 && (
          <p style={styles.empty}>Sem dados ainda.</p>
        )}

        <div style={styles.bars}>
          {metrics.tables.map((t) => (
            <div key={t.tabela} style={styles.barRow}>
              <span style={styles.barLabel}>{t.tabela}</span>

              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${(t.count / metrics.total) * 100 || 5}%`,
                  }}
                />
              </div>

              <span style={styles.barValue}>{t.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== COMPONENTES =====

function Card({
  label,
  value,
  color = "#e5e7eb",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardValue, color }}>{value}</div>
      <div style={styles.cardLabel}>{label}</div>
    </div>
  );
}

// ===== ESTILO =====

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    padding: spacing.xxl,
    color: colors.text.secondary,
  },

  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xl,
  },

  subtitle: {
    fontSize: typography.fontSize.md,
    marginBottom: spacing.base,
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: spacing.base,
    marginBottom: spacing.xxl,
  },

  card: {
    background: colors.background.darkest,
    border: `1px solid ${colors.border.medium}`,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    textAlign: "center",
  },

  cardValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },

  cardLabel: {
    fontSize: typography.fontSize.xs,
    color: "#94a3b8",
  },

  block: {
    background: colors.background.darkest,
    border: `1px solid ${colors.border.medium}`,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
  },

  empty: {
    color: "#64748b",
  },

  bars: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.md,
  },

  barRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 40px",
    alignItems: "center",
    gap: spacing.md,
  },

  barLabel: {
    fontSize: typography.fontSize.xs,
    color: "#94a3b8",
  },

  barTrack: {
    height: 8,
    background: colors.border.medium,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    background: "#38bdf8",
  },

  barValue: {
    fontSize: typography.fontSize.xs,
    textAlign: "right",
  },
};