"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ===== CHART ===== */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

type Props = {
  userEmail: string;
};

export default function AdminDashboardClient({ userEmail }: Props) {
  const [totalPropostas, setTotalPropostas] = useState(0);
  const [editaisAtivos, setEditaisAtivos] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("-");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { count } = await supabase
      .from("propostas")
      .select("*", { count: "exact", head: true });

    setTotalPropostas(count || 0);

    const { count: editaisCount } = await supabase
      .from("editais")
      .select("*", { count: "exact", head: true })
      .eq("status", "aberto");

    setEditaisAtivos(editaisCount || 0);

    const { data } = await supabase
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      setLogs(data);

      if (data.length > 0) {
        setUltimaAtualizacao(new Date(data[0].created_at).toLocaleString());
      }
    }
  }

  const totalAcoes = logs.length;
  const insert = logs.filter((l) => l.acao === "INSERT").length;
  const update = logs.filter((l) => l.acao === "UPDATE").length;
  const del = logs.filter((l) => l.acao === "DELETE").length;

  const logsPorDia: Record<string, number> = {};

  logs.forEach((log) => {
    const data = new Date(log.created_at).toLocaleDateString();
    logsPorDia[data] = (logsPorDia[data] || 0) + 1;
  });

  const labels = Object.keys(logsPorDia).slice(-7);
  const values = Object.values(logsPorDia).slice(-7);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Atividade",
        data: values,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.2)",
        tension: 0.4,
      },
    ],
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.userBox}>Usuário: {userEmail}</div>

      <div style={styles.kpiGrid}>
        <BigCard title="Propostas" value={totalPropostas} />
        <BigCard title="Editais Ativos" value={editaisAtivos} />
        <BigCard title="Ações" value={totalAcoes} />
        <BigCard title="Atualização" value={ultimaAtualizacao} />
      </div>

      <div style={styles.chartBlock}>
        <h3 style={styles.sectionTitle}>Atividade Recente</h3>
        <Line data={chartData} />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Atividade do Sistema</h3>

        <div style={styles.smallGrid}>
          <SmallCard title="INSERT" value={insert} color="#22c55e" />
          <SmallCard title="UPDATE" value={update} color="#38bdf8" />
          <SmallCard title="DELETE" value={del} color="#ef4444" />
        </div>
      </div>
    </div>
  );
}

function BigCard({ title, value }: any) {
  return (
    <div style={styles.bigCard}>
      <div style={styles.bigValue}>{value}</div>
      <div style={styles.bigLabel}>{title}</div>
    </div>
  );
}

function SmallCard({ title, value, color }: any) {
  return (
    <div style={styles.smallCard}>
      <div style={{ ...styles.smallValue, color }}>{value}</div>
      <div style={styles.smallLabel}>{title}</div>
    </div>
  );
}

const styles: any = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },

  userBox: {
    color: "#94a3b8",
    fontSize: 13,
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 18,
  },

  bigCard: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: 18,
    padding: 22,
  },

  bigValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#e5e7eb",
  },

  bigLabel: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 6,
  },

  chartBlock: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: 18,
    padding: 20,
  },

  section: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: 18,
    padding: 20,
  },

  sectionTitle: {
    marginBottom: 14,
    color: "#e5e7eb",
    fontWeight: 600,
  },

  smallGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
  },

  smallCard: {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: 14,
  },

  smallValue: {
    fontSize: 20,
    fontWeight: 700,
  },

  smallLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
};