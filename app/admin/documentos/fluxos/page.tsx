"use client";

import { useCallback, useEffect, useState } from "react";
import type { GdWorkflow, GdWorkflowStep } from "@/lib/documentos/types";
import { rotuloStatus } from "@/lib/documentos/labels";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";

export default function FluxosPage() {
  const [workflows, setWorkflows] = useState<GdWorkflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [steps, setSteps] = useState<GdWorkflowStep[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const [stepName, setStepName] = useState("");
  const [fromStatus, setFromStatus] = useState("draft");
  const [toStatus, setToStatus] = useState("in_review");
  const [roleRequired, setRoleRequired] = useState("gestor");

  const carregarLista = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documentos/fluxos", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setWorkflows(json.workflows || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar fluxos.");
    }
    setLoading(false);
  }, []);

  const carregarDetalhe = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/documentos/fluxos?id=${id}`, {
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao carregar fluxo.");
      return;
    }
    setSelectedId(id);
    setSteps(json.steps || []);
    setName(json.workflow?.name || "");
    setDescription(json.workflow?.description || "");
  }, []);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  async function criar() {
    const res = await fetch("/api/admin/documentos/fluxos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        seed_padrao: true,
        is_default: workflows.length === 0,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro ao criar fluxo.", "error");
      return;
    }
    setName("");
    setDescription("");
    triggerToast("Fluxo criado.", "success");
    await carregarLista();
    if (json.workflow?.id) await carregarDetalhe(json.workflow.id);
  }

  async function salvarFluxo() {
    if (!selectedId) return;
    const res = await fetch("/api/admin/documentos/fluxos", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedId,
        name,
        description,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro ao salvar.", "error");
      return;
    }
    triggerToast("Fluxo atualizado.", "success");
    carregarLista();
  }

  async function removerFluxo(id: string) {
    const ok = await confirmAction("Remover este fluxo?");
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm("Remover este fluxo?")) return;
      else if (isConfirmModalReady()) return;
    }
    const res = await fetch(`/api/admin/documentos/fluxos?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro ao remover.", "error");
      return;
    }
    triggerToast("Fluxo removido.", "success");
    if (selectedId === id) {
      setSelectedId(null);
      setSteps([]);
    }
    carregarLista();
  }

  async function adicionarPasso() {
    if (!selectedId) return;
    const res = await fetch("/api/admin/documentos/fluxos/passos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflow_id: selectedId,
        name: stepName,
        from_status: fromStatus,
        to_status: toStatus,
        role_required: roleRequired,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro ao adicionar passo.", "error");
      return;
    }
    triggerToast("Passo adicionado.", "success");
    setStepName("");
    carregarDetalhe(selectedId);
  }

  async function removerPasso(id: string) {
    if (!selectedId) return;
    const res = await fetch(`/api/admin/documentos/fluxos/passos?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro ao remover passo.", "error");
      return;
    }
    triggerToast("Passo removido.", "success");
    carregarDetalhe(selectedId);
  }

  return (
    <GestaoDocumentalShell
      title="Fluxos"
      description="Workflows configuráveis de revisão, aprovação e assinatura."
    >
      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b", color: "#fde68a" }}>
          {aviso}
        </div>
      ) : null}

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Novo fluxo
        </h2>
        <p style={{ fontSize: 13, opacity: 0.85 }}>
          Ao criar, os passos padrão institucionais são gerados automaticamente
          (rascunho → revisão → aprovação → assinatura → arquivo).
        </p>
        <input
          style={{ ...gdInputStyle, marginBottom: 8 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do fluxo"
        />
        <input
          style={{ ...gdInputStyle, marginBottom: 8 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
        />
        <button
          type="button"
          style={gdBtnStyle}
          disabled={!name.trim()}
          onClick={criar}
        >
          Criar com passos padrão
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 280px) 1fr",
            gap: 12,
            marginTop: 12,
          }}
        >
          <div style={{ ...gdCardStyle, marginTop: 0 }}>
            <h2 className="admin-h2" style={{ marginTop: 0 }}>
              Fluxos
            </h2>
            {workflows.length === 0 ? (
              <p style={{ fontSize: 13 }}>Nenhum fluxo ainda.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {workflows.map((w) => (
                  <div key={w.id} style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      style={{
                        ...gdBtnStyle,
                        flex: 1,
                        background:
                          selectedId === w.id ? "#1e40af" : "#334155",
                        textAlign: "left",
                      }}
                      onClick={() => carregarDetalhe(w.id)}
                    >
                      {w.name}
                      {w.is_default ? " ★" : ""}
                    </button>
                    <button
                      type="button"
                      style={{ ...gdBtnStyle, background: "#ef4444" }}
                      onClick={() => removerFluxo(w.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...gdCardStyle, marginTop: 0 }}>
            {!selectedId ? (
              <p>Selecione um fluxo para editar passos.</p>
            ) : (
              <>
                <h2 className="admin-h2" style={{ marginTop: 0 }}>
                  Editar fluxo
                </h2>
                <input
                  style={{ ...gdInputStyle, marginBottom: 8 }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  style={{ ...gdInputStyle, marginBottom: 8 }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição"
                />
                <button type="button" style={gdBtnStyle} onClick={salvarFluxo}>
                  Salvar fluxo
                </button>

                <h2 className="admin-h2" style={{ marginTop: 20 }}>
                  Passos
                </h2>
                {steps.length === 0 ? (
                  <p style={{ fontSize: 13 }}>Nenhum passo.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {steps.map((s) => (
                      <li key={s.id} style={{ marginBottom: 8 }}>
                        <strong>
                          {s.step_order}. {s.name}
                        </strong>
                        <br />
                        <span style={{ fontSize: 13, opacity: 0.85 }}>
                          {s.from_status
                            ? rotuloStatus(s.from_status)
                            : "qualquer"}{" "}
                          → {s.to_status ? rotuloStatus(s.to_status) : "—"}
                          {s.role_required
                            ? ` · papel: ${s.role_required}`
                            : ""}
                        </span>{" "}
                        <button
                          type="button"
                          style={{
                            ...gdBtnStyle,
                            background: "#ef4444",
                            padding: "2px 8px",
                            fontSize: 12,
                          }}
                          onClick={() => removerPasso(s.id)}
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <h2 className="admin-h2" style={{ marginTop: 20 }}>
                  Adicionar passo
                </h2>
                <input
                  style={{ ...gdInputStyle, marginBottom: 8 }}
                  value={stepName}
                  onChange={(e) => setStepName(e.target.value)}
                  placeholder="Nome do passo"
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    style={{ ...gdInputStyle, maxWidth: 160 }}
                    value={fromStatus}
                    onChange={(e) => setFromStatus(e.target.value)}
                    placeholder="de (status)"
                  />
                  <input
                    style={{ ...gdInputStyle, maxWidth: 160 }}
                    value={toStatus}
                    onChange={(e) => setToStatus(e.target.value)}
                    placeholder="para (status)"
                  />
                  <input
                    style={{ ...gdInputStyle, maxWidth: 160 }}
                    value={roleRequired}
                    onChange={(e) => setRoleRequired(e.target.value)}
                    placeholder="papel"
                  />
                </div>
                <button
                  type="button"
                  style={{ ...gdBtnStyle, marginTop: 8 }}
                  disabled={!stepName.trim()}
                  onClick={adicionarPasso}
                >
                  Adicionar passo
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </GestaoDocumentalShell>
  );
}
