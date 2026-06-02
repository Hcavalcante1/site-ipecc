"use client";

import { useCallback, useEffect, useState } from "react";
import {
  labelConversationState,
  formatWaIdDisplay,
} from "@/lib/whatsapp/stateLabels";

type Conversation = {
  wa_id: string;
  state: string;
  unknown_count: number;
  from_site_hint: boolean;
  human_assigned_to: string | null;
  last_message_at: string;
  updated_at: string;
};

export default function WhatsAppAdminPage() {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [handoffOnly, setHandoffOnly] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignValue, setAssignValue] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const qs = handoffOnly ? "?handoff=1" : "";
    const res = await fetch(`/api/admin/whatsapp/conversations${qs}`);
    const json = await res.json();

    if (!res.ok || !json.ok) {
      setAviso(json.error ?? "Erro ao carregar conversas");
      setRows([]);
    } else {
      setRows(json.conversations ?? []);
      setAviso(json.aviso ?? null);
    }
    setLoading(false);
  }, [handoffOnly]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atribuir(waId: string) {
    const human = assignValue.trim();
    if (!human) {
      alert("Informe e-mail ou identificador do responsável.");
      return;
    }

    const res = await fetch("/api/admin/whatsapp/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wa_id: waId, human_assigned_to: human }),
    });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      alert(json.error ?? "Erro ao atribuir");
      return;
    }

    setAssigning(null);
    setAssignValue("");
    carregar();
  }

  async function encerrar(waId: string) {
    if (!confirm("Encerrar esta conversa no painel?")) return;

    const res = await fetch("/api/admin/whatsapp/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wa_id: waId, state: "closed" }),
    });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      alert(json.error ?? "Erro ao encerrar");
      return;
    }
    carregar();
  }

  return (
    <div style={{ padding: 24, color: "#e5e7eb" }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>WhatsApp — atendimentos</h1>
      <p style={{ color: "#94a3b8", marginTop: 8, maxWidth: 720 }}>
        Acompanhe conversas persistidas pelo bot e assuma atendimentos que
        exigem equipe humana. As respostas automaticas continuam pelo webhook;
        este painel serve para handoff, responsavel e encerramento.
      </p>

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={handoffOnly}
            onChange={(e) => setHandoffOnly(e.target.checked)}
          />
          Somente aguardando equipe
        </label>
        <button
          type="button"
          onClick={() => carregar()}
          style={{
            padding: "8px 16px",
            background: "#1e40af",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Atualizar
        </button>
      </div>

      {aviso && (
        <p
          style={{
            marginTop: 16,
            padding: 12,
            background: "#422006",
            borderRadius: 8,
            color: "#fcd34d",
          }}
        >
          {aviso}
        </p>
      )}

      {loading ? (
        <p style={{ marginTop: 24 }}>Carregando...</p>
      ) : rows.length === 0 ? (
        <p style={{ marginTop: 24, color: "#94a3b8" }}>
          Nenhuma conversa registrada.
        </p>
      ) : (
        <div style={{ marginTop: 24, overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
                <th style={{ padding: 10 }}>Contato</th>
                <th style={{ padding: 10 }}>Estado</th>
                <th style={{ padding: 10 }}>Responsável</th>
                <th style={{ padding: 10 }}>Última msg</th>
                <th style={{ padding: 10 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.wa_id}
                  style={{ borderBottom: "1px solid #1e293b" }}
                >
                  <td style={{ padding: 10 }}>
                    <div>{formatWaIdDisplay(r.wa_id)}</div>
                    {r.from_site_hint && (
                      <span style={{ fontSize: 12, color: "#38bdf8" }}>
                        veio do site
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 10 }}>
                    {labelConversationState(r.state)}
                    {r.unknown_count > 0 && (
                      <span style={{ color: "#fbbf24", marginLeft: 6 }}>
                        ({r.unknown_count} dúvidas)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 10 }}>
                    {r.human_assigned_to ?? "—"}
                  </td>
                  <td style={{ padding: 10 }}>
                    {new Date(r.last_message_at).toLocaleString("pt-BR")}
                  </td>
                  <td style={{ padding: 10 }}>
                    {assigning === r.wa_id ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input
                          type="text"
                          placeholder="e-mail responsável"
                          value={assignValue}
                          onChange={(e) => setAssignValue(e.target.value)}
                          style={{
                            padding: 6,
                            borderRadius: 6,
                            border: "1px solid #475569",
                            background: "#0f172a",
                            color: "#fff",
                            minWidth: 180,
                          }}
                        />
                        <button type="button" onClick={() => atribuir(r.wa_id)}>
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAssigning(null);
                            setAssignValue("");
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAssigning(r.wa_id);
                            setAssignValue(r.human_assigned_to ?? "");
                          }}
                        >
                          Atribuir
                        </button>
                        {r.state !== "closed" && (
                          <button type="button" onClick={() => encerrar(r.wa_id)}>
                            Encerrar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
