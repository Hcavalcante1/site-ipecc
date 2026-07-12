"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  labelConversationState,
  formatWaIdDisplay,
} from "@/lib/whatsapp/stateLabels";
import { getWhatsAppSubjectLabel } from "@/lib/whatsapp/publicWhatsApp";

type Tab = "atendimentos" | "leads";

type Conversation = {
  wa_id: string;
  state: string;
  unknown_count: number;
  from_site_hint: boolean;
  human_assigned_to: string | null;
  last_message_at: string;
  updated_at: string;
};

type Lead = {
  id: string;
  created_at: string;
  nome: string;
  organizacao: string | null;
  telefone: string;
  email: string | null;
  assunto: string;
  mensagem: string | null;
  pagina_origem: string | null;
};

const btnBase: CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  border: "none",
};

export default function WhatsAppAdminPage() {
  const [tab, setTab] = useState<Tab>("leads");
  const [rows, setRows] = useState<Conversation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [handoffOnly, setHandoffOnly] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignValue, setAssignValue] = useState("");

  const carregarConversas = useCallback(async () => {
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

  const carregarLeads = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/whatsapp/leads");
    const json = await res.json();

    if (!res.ok || !json.ok) {
      setAviso(json.error ?? "Erro ao carregar leads");
      setLeads([]);
    } else {
      setLeads(json.leads ?? []);
      setAviso(json.aviso ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "leads") void carregarLeads();
    else void carregarConversas();
  }, [tab, carregarLeads, carregarConversas]);

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
    carregarConversas();
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
    carregarConversas();
  }

  return (
    <div style={{ padding: 24, color: "#e5e7eb" }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>WhatsApp</h1>
      <p style={{ color: "#94a3b8", marginTop: 8, maxWidth: 720 }}>
        Leads do formulário do site (wa.me) e atendimentos do bot Cloud API.
        A publicação automática pela Meta permanece desligada até a verificação
        da empresa.
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          style={{
            ...btnBase,
            background: tab === "leads" ? "#1e40af" : "transparent",
            color: "#fff",
            border: tab === "leads" ? "none" : "1px solid #334155",
          }}
          onClick={() => setTab("leads")}
        >
          Leads
        </button>
        <button
          type="button"
          style={{
            ...btnBase,
            background: tab === "atendimentos" ? "#1e40af" : "transparent",
            color: "#fff",
            border: tab === "atendimentos" ? "none" : "1px solid #334155",
          }}
          onClick={() => setTab("atendimentos")}
        >
          Atendimentos
        </button>
        <button
          type="button"
          onClick={() =>
            tab === "leads" ? void carregarLeads() : void carregarConversas()
          }
          style={{
            ...btnBase,
            background: "#1e40af",
            color: "#fff",
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

      {tab === "leads" ? (
        <>
          <p style={{ color: "#94a3b8", marginTop: 16, maxWidth: 720 }}>
            Pré-cadastros enviados pelo formulário público antes de abrir o
            WhatsApp. Para gravar novos leads, ative{" "}
            <code>WHATSAPP_LEADS_PERSIST_SUPABASE=1</code> na Vercel e aplique o
            SQL da tabela.
          </p>

          {loading ? (
            <p style={{ marginTop: 24 }}>Carregando…</p>
          ) : leads.length === 0 ? (
            <p style={{ marginTop: 24, color: "#94a3b8" }}>
              Nenhum lead registrado.
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
                  <tr
                    style={{
                      borderBottom: "1px solid #334155",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: 10 }}>Data</th>
                    <th style={{ padding: 10 }}>Nome</th>
                    <th style={{ padding: 10 }}>Telefone</th>
                    <th style={{ padding: 10 }}>Assunto</th>
                    <th style={{ padding: 10 }}>Mensagem</th>
                    <th style={{ padding: 10 }}>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr
                      key={l.id}
                      style={{ borderBottom: "1px solid #1e293b" }}
                    >
                      <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ padding: 10 }}>
                        <div>{l.nome}</div>
                        {l.organizacao && (
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            {l.organizacao}
                          </div>
                        )}
                        {l.email && (
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            {l.email}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 10 }}>{l.telefone}</td>
                      <td style={{ padding: 10 }}>
                        {getWhatsAppSubjectLabel(l.assunto)}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          maxWidth: 280,
                          color: "#cbd5e1",
                        }}
                      >
                        {l.mensagem
                          ? l.mensagem.length > 120
                            ? `${l.mensagem.slice(0, 120)}…`
                            : l.mensagem
                          : "—"}
                      </td>
                      <td style={{ padding: 10, color: "#94a3b8" }}>
                        {l.pagina_origem || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
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
          </div>

          {loading ? (
            <p style={{ marginTop: 24 }}>Carregando…</p>
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
                  <tr
                    style={{
                      borderBottom: "1px solid #334155",
                      textAlign: "left",
                    }}
                  >
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
                          <div
                            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                          >
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
                            <button
                              type="button"
                              onClick={() => atribuir(r.wa_id)}
                            >
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
                          <div
                            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                          >
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
                              <button
                                type="button"
                                onClick={() => encerrar(r.wa_id)}
                              >
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
        </>
      )}
    </div>
  );
}
