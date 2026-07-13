"use client";

import { useCallback, useEffect, useState } from "react";
import GestaoDocumentalShell, {
  gdCardStyle,
} from "../components/GestaoDocumentalShell";

type LogRow = {
  id: string;
  action: string;
  document_id: string | null;
  actor_email: string | null;
  created_at: string;
  detail: Record<string, unknown> | null;
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documentos/auditoria", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setLogs(json.logs || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar auditoria.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <GestaoDocumentalShell
      title="Auditoria"
      description="Registro de ações do módulo Gestão Documental."
    >
      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b", color: "#fde68a" }}>
          {aviso}
        </div>
      ) : null}

      {loading ? (
        <p>Carregando...</p>
      ) : logs.length === 0 ? (
        <div style={gdCardStyle}>Nenhum evento registrado ainda.</div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {logs.map((log) => (
            <div key={log.id} style={{ ...gdCardStyle, marginTop: 0 }}>
              <strong>{log.action}</strong>
              <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.85 }}>
                {new Date(log.created_at).toLocaleString("pt-BR")}
                {log.actor_email ? ` · ${log.actor_email}` : ""}
                {log.document_id ? ` · doc ${log.document_id.slice(0, 8)}…` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </GestaoDocumentalShell>
  );
}
