"use client";

import { useCallback, useEffect, useState } from "react";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import GestaoDocumentalShell, {
  gdBtnStyle,
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

type EvidenciaRow = {
  id: string;
  document_id: string;
  nome: string;
  email: string;
  signed_at: string;
  validation_code: string;
  signature_serial: number;
  ip: string | null;
  document_hash_sha256: string;
  signed_hash_sha256: string;
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [evidencias, setEvidencias] = useState<EvidenciaRow[]>([]);
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [limpando, setLimpando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [resLogs, resEv] = await Promise.all([
      fetch("/api/admin/documentos/auditoria", { credentials: "include" }),
      fetch("/api/admin/documentos/evidencias?limit=50", {
        credentials: "include",
      }),
    ]);
    const jsonLogs = await resLogs.json();
    const jsonEv = await resEv.json();

    const avisos: string[] = [];
    if (resLogs.ok) {
      setLogs(jsonLogs.logs || []);
      if (jsonLogs.aviso) avisos.push(jsonLogs.aviso);
    } else {
      avisos.push(jsonLogs.error || "Erro ao carregar logs.");
    }

    if (resEv.ok) {
      setEvidencias(jsonEv.evidencias || []);
      if (jsonEv.aviso) avisos.push(jsonEv.aviso);
    } else {
      avisos.push(jsonEv.error || "Erro ao carregar evidências.");
    }

    setAviso(avisos.join(" "));
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function baixarCSV() {
    if (logs.length === 0) return;
    const header = ["id", "action", "actor_email", "document_id", "created_at", "detail"];
    const linhas = logs.map((l) =>
      [
        l.id,
        l.action,
        l.actor_email ?? "",
        l.document_id ?? "",
        l.created_at,
        l.detail ? JSON.stringify(l.detail).replace(/"/g, '""') : "",
      ]
        .map((v) => `"${v}"`)
        .join(",")
    );
    const csv = [header.join(","), ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function limparLogs() {
    const ok = await confirmAction(`Excluir ${logs.length} log(s) permanentemente? Faça o download antes se quiser guardar.`);
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm(`Excluir ${logs.length} log(s) permanentemente? Faça o download antes se quiser guardar.`)) return;
      else if (isConfirmModalReady()) return;
    }
    setLimpando(true);
    const res = await fetch("/api/admin/documentos/auditoria", {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    setLimpando(false);
    if (!res.ok) {
      setAviso(json.error || "Erro ao limpar logs.");
      return;
    }
    carregar();
  }

  return (
    <GestaoDocumentalShell
      title="Auditoria"
      description="Logs do módulo e evidências de assinatura eletrônica IPECC."
      actions={
        logs.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#334155" }}
              onClick={baixarCSV}
            >
              Baixar CSV
            </button>
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#7f1d1d" }}
              onClick={limparLogs}
              disabled={limpando}
            >
              {limpando ? "Limpando…" : `Limpar logs (${logs.length})`}
            </button>
          </div>
        ) : undefined
      }
    >
      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b", color: "#fde68a" }}>
          {aviso}
        </div>
      ) : null}

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>
              Evidências de assinatura
            </h2>
            {evidencias.length === 0 ? (
              <div style={gdCardStyle}>
                Nenhuma evidência IPECC registrada ainda.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {evidencias.map((ev) => (
                  <div key={ev.id} style={{ ...gdCardStyle, marginTop: 0 }}>
                    <strong>
                      {ev.nome} · #{ev.signature_serial}
                    </strong>
                    <p
                      style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.85 }}
                    >
                      {new Date(ev.signed_at).toLocaleString("pt-BR")}
                      {` · ${ev.email}`}
                      {` · código ${ev.validation_code}`}
                      {ev.ip ? ` · IP ${ev.ip}` : ""}
                      {` · doc ${ev.document_id.slice(0, 8)}…`}
                    </p>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 12,
                        opacity: 0.7,
                        wordBreak: "break-all",
                      }}
                    >
                      Hash assinado: {ev.signed_hash_sha256.slice(0, 24)}…
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 10,
                      }}
                    >
                      <a
                        href={`/api/admin/documentos/evidencias/${ev.id}/laudo`}
                        style={{
                          ...gdBtnStyle,
                          textDecoration: "none",
                          background: "#0f766e",
                        }}
                      >
                        Baixar laudo (.txt)
                      </a>
                      <a
                        href={`/api/admin/documentos/evidencias/${ev.id}/laudo?format=csv`}
                        style={{
                          ...gdBtnStyle,
                          textDecoration: "none",
                          background: "#334155",
                        }}
                      >
                        Baixar CSV
                      </a>
                      <a
                        href={`/validar/${ev.validation_code}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...gdBtnStyle,
                          textDecoration: "none",
                          background: "#1e3a5f",
                        }}
                      >
                        Abrir validação
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>
              Logs do módulo
            </h2>
            {logs.length === 0 ? (
              <div style={gdCardStyle}>Nenhum evento registrado ainda.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {logs.map((log) => (
                  <div key={log.id} style={{ ...gdCardStyle, marginTop: 0 }}>
                    <strong>{log.action}</strong>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        opacity: 0.85,
                      }}
                    >
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                      {log.actor_email ? ` · ${log.actor_email}` : ""}
                      {log.document_id
                        ? ` · doc ${log.document_id.slice(0, 8)}…`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </GestaoDocumentalShell>
  );
}
