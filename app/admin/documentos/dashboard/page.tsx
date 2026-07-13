"use client";

import { useCallback, useEffect, useState } from "react";
import type { GdDashboardCounts } from "@/lib/documentos/types";
import GestaoDocumentalShell, {
  gdCardStyle,
} from "../components/GestaoDocumentalShell";

const LABELS: Array<{ key: keyof GdDashboardCounts; label: string }> = [
  { key: "ativos", label: "Documentos ativos" },
  { key: "em_revisao", label: "Em revisão" },
  { key: "pendentes", label: "Pendentes" },
  { key: "prontos_assinatura", label: "Prontos para assinatura" },
  { key: "assinados", label: "Assinados" },
  { key: "rejeitados", label: "Rejeitados" },
  { key: "arquivados", label: "Arquivados" },
  { key: "lotes_ativos", label: "Lotes ativos" },
];

export default function DocumentosDashboardPage() {
  const [counts, setCounts] = useState<GdDashboardCounts | null>(null);
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documentos/dashboard", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setCounts(json.counts);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar indicadores.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <GestaoDocumentalShell
      title="Dashboard documental"
      description="Indicadores do departamento de Gestão Documental."
    >
      {aviso ? (
        <div
          style={{
            ...gdCardStyle,
            borderColor: "#f59e0b",
            color: "#fde68a",
          }}
        >
          {aviso}
        </div>
      ) : null}

      {loading ? (
        <p style={{ marginTop: 16 }}>Carregando indicadores...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 8,
          }}
        >
          {LABELS.map((item) => (
            <div key={item.key} style={gdCardStyle}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{item.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
                {counts?.[item.key] ?? 0}
              </div>
            </div>
          ))}
        </div>
      )}
    </GestaoDocumentalShell>
  );
}
