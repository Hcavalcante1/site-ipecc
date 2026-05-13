"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

    const header = ["Email", "Ação", "Tabela", "Data"];

    const rows = logs.map((log) => [
      log.user_email,
      log.acao,
      log.tabela,
      new Date(log.created_at).toLocaleString(),
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
      <h1 style={styles.title}>Logs do Sistema</h1>

      <button onClick={exportCSV} style={styles.exportBtn}>
        Exportar CSV
      </button>

      {/* FILTROS */}
      <div style={styles.filters}>
        <select value={acao} onChange={(e) => setAcao(e.target.value)}>
          <option value="">Todas ações</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
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
                {log.acao}
              </span>

              <span style={styles.tabela}>{log.tabela}</span>
            </div>

            <div style={styles.info}>
              <strong>{log.user_email}</strong>
              <span>
                {new Date(log.created_at).toLocaleString()}
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
    padding: 24,
    color: "#e5e7eb",
  },

  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 12,
  },

  exportBtn: {
    marginBottom: 16,
    padding: "8px 16px",
    borderRadius: 999,
    border: "none",
    background: "#22c55e",
    color: "#022c22",
    fontWeight: 600,
    cursor: "pointer",
  },

  filters: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },

  loading: {
    color: "#94a3b8",
  },

  empty: {
    color: "#64748b",
  },

  table: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  row: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 14,
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },

  badge: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
  },

  tabela: {
    color: "#94a3b8",
    fontSize: 13,
  },

  info: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
  },

  details: {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: 10,
    fontSize: 11,
    color: "#38bdf8",
    overflowX: "auto",
  },
};