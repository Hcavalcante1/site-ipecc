"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
} from "../components/GestaoDocumentalShell";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  event_type: string;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificacoesPage() {
  const [rows, setRows] = useState<Notif[]>([]);
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documentos/notificacoes", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setRows(json.notifications || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar notificações.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function marcarLida(id: string) {
    await fetch("/api/admin/documentos/notificacoes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    carregar();
  }

  return (
    <GestaoDocumentalShell
      title="Notificações"
      description="Alertas in-app de assinatura, fluxos e lotes (Fase 6)."
    >
      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b" }}>{aviso}</div>
      ) : null}

      <div style={gdCardStyle}>
        {loading ? <p>Carregando...</p> : null}
        {!loading && rows.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Nenhuma notificação.</p>
        ) : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {rows.map((n) => (
            <li
              key={n.id}
              style={{
                borderTop: "1px solid #334155",
                padding: "12px 0",
                opacity: n.read_at ? 0.7 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>{n.title}</strong>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    {n.event_type} ·{" "}
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </div>
                  {n.body ? <p style={{ margin: "6px 0 0" }}>{n.body}</p> : null}
                  {n.link_path ? (
                    <Link href={n.link_path} style={{ fontSize: 13 }}>
                      Abrir
                    </Link>
                  ) : null}
                </div>
                {!n.read_at ? (
                  <button
                    type="button"
                    style={gdBtnStyle}
                    onClick={() => marcarLida(n.id)}
                  >
                    Marcar lida
                  </button>
                ) : (
                  <span style={{ fontSize: 12 }}>Lida</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </GestaoDocumentalShell>
  );
}
