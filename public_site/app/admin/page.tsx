


"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboardPage() {
  const [labels, setLabels] = useState<string[]>([]);
  const [propostasData, setPropostasData] = useState<number[]>([]);
  const [editaisData, setEditaisData] = useState<number[]>([]);

  const [totalPropostas, setTotalPropostas] = useState<number>(0);
  const [novas7Dias, setNovas7Dias] = useState<number>(0);
  const [editaisAtivos, setEditaisAtivos] = useState<number>(0);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>("—");

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  };

  const buttonStyle = {
    background: "linear-gradient(90deg, #22c55e, #16a34a)",
    color: "#022c22",
    border: "none",
    borderRadius: 999,
    padding: "8px 18px",
    fontWeight: 700,
    cursor: "pointer",
  };

  useEffect(() => {
    async function loadData() {
      /* ===== INDICADORES ===== */

      const { count: total } = await supabase
        .from("propostas")
        .select("*", { count: "exact", head: true });
      setTotalPropostas(total ?? 0);

      const seteDias = new Date();
      seteDias.setDate(seteDias.getDate() - 7);

      const { count: recentes } = await supabase
        .from("propostas")
        .select("*", { count: "exact", head: true })
        .gte("created_at", seteDias.toISOString());
      setNovas7Dias(recentes ?? 0);

      const { count: ativos } = await supabase
        .from("editais")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);
      setEditaisAtivos(ativos ?? 0);

      const { data: ultima } = await supabase
        .from("propostas")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (ultima?.created_at) {
        setUltimaAtualizacao(
          new Date(ultima.created_at).toLocaleString("pt-BR")
        );
      }

      /* ===== GRÁFICO (EVOLUÇÃO ACUMULADA) ===== */

      const { data: propostas } = await supabase
        .from("propostas")
        .select("created_at")
        .order("created_at", { ascending: true });

      const { data: editais } = await supabase
        .from("editais")
        .select("created_at")
        .order("created_at", { ascending: true });

      const mapa: Record<string, { propostas: number; editais: number }> = {};

      propostas?.forEach((p) => {
        const d = new Date(p.created_at).toLocaleDateString("pt-BR");
        mapa[d] = mapa[d] || { propostas: 0, editais: 0 };
        mapa[d].propostas++;
      });

      editais?.forEach((e) => {
        const d = new Date(e.created_at).toLocaleDateString("pt-BR");
        mapa[d] = mapa[d] || { propostas: 0, editais: 0 };
        mapa[d].editais++;
      });

      const dias = Object.keys(mapa);
      let accProp = 0;
      let accEdit = 0;

      const propSeries: number[] = [];
      const editSeries: number[] = [];

      dias.forEach((d) => {
        accProp += mapa[d].propostas;
        accEdit += mapa[d].editais;
        propSeries.push(accProp);
        editSeries.push(accEdit);
      });

      setLabels(dias);
      setPropostasData(propSeries);
      setEditaisData(editSeries);
    }

    loadData();
  }, []);

  return (
    <>
      <div className="admin-header-block">
        <h1 className="admin-title">Dashboard do Site</h1>
        <p className="admin-subtitle">Painel administrativo interno.</p>
      </div>

      <div className="admin-card">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {/* INDICADORES */}
          <div style={cardStyle}>
            <h3>Total de Propostas</h3>
            <p>{totalPropostas}</p>
          </div>

          <div style={cardStyle}>
            <h3>Novas (7 dias)</h3>
            <p>{novas7Dias}</p>
          </div>

          <div style={cardStyle}>
            <h3>Editais Ativos</h3>
            <p>{editaisAtivos}</p>
          </div>

          <div style={cardStyle}>
            <h3>Última Atualização</h3>
            <p>{ultimaAtualizacao}</p>
          </div>

          {/* GRÁFICO */}
          <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
            <h3 style={{ marginBottom: 12 }}>
              Evolução acumulada do sistema
            </h3>

            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: "Propostas",
                    data: propostasData,
                    borderColor: "#22c55e",
                    backgroundColor: "rgba(34,197,94,0.15)",
                    tension: 0.4,
                    fill: true,
                  },
                  {
                    label: "Editais",
                    data: editaisData,
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59,130,246,0.15)",
                    tension: 0.4,
                    fill: true,
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: true } },
                scales: {
                  x: { ticks: { color: "#9ca3af" } },
                  y: { ticks: { color: "#9ca3af" } },
                },
              }}
            />
          </div>

          {/* CARDS EXISTENTES */}
          <div style={cardStyle}>
            <h3>Páginas</h3>
            <p style={{ marginBottom: 14 }}>Editar conteúdo do site</p>
            <a href="/admin/paginas">
              <button style={buttonStyle}>Editar</button>
            </a>
          </div>

          <div style={cardStyle}>
            <h3>Propostas</h3>
            <p style={{ marginBottom: 14 }}>
              Visualizar propostas recebidas
            </p>
            <a href="/admin/propostas">
              <button style={buttonStyle}>Editar</button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}


