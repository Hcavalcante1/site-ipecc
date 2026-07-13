"use client";

import { useCallback, useEffect, useState } from "react";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";

type Batch = {
  id: string;
  title: string;
  status: string;
  progress_done: number;
  progress_total: number;
  created_at: string;
};

type BatchItem = {
  id: string;
  document_id: string;
  status: string;
  sort_order: number;
};

export default function LotesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [title, setTitle] = useState("");
  const [docIds, setDocIds] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documentos/lotes", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setBatches(json.batches || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar lotes.");
    }
    setLoading(false);
  }, []);

  const carregarDetalhe = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/documentos/lotes?id=${id}`, {
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao carregar lote.");
      return;
    }
    setSelectedId(id);
    setItems(json.items || []);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criar() {
    const document_ids = docIds
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/admin/documentos/lotes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, document_ids }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao criar lote.");
      return;
    }
    setTitle("");
    setDocIds("");
    await carregar();
    if (json.batch?.id) await carregarDetalhe(json.batch.id);
  }

  async function atualizarStatus(status: string) {
    if (!selectedId) return;
    const res = await fetch("/api/admin/documentos/lotes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId, status }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao atualizar lote.");
      return;
    }
    setAviso(`Lote marcado como ${status}.`);
    await carregar();
    await carregarDetalhe(selectedId);
  }

  async function excluir(id: string) {
    if (!confirm("Cancelar e arquivar este lote?")) return;
    const res = await fetch(`/api/admin/documentos/lotes?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao excluir.");
      return;
    }
    setSelectedId(null);
    setItems([]);
    carregar();
  }

  async function autorizarLote() {
    if (!selectedId) return;
    const res = await fetch("/api/admin/documentos/assinaturas/authorize", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batch_id: selectedId,
        scope: "signature_session",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao autorizar lote no gov.br.");
      return;
    }
    window.location.href = json.authorizationUrl;
  }

  return (
    <GestaoDocumentalShell
      title="Lotes"
      description="Assinatura em lote com progresso, pausa e retomada (scope signature_session)."
    >
      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b" }}>{aviso}</div>
      ) : null}

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Novo lote
        </h2>
        <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
          <input
            style={gdInputStyle}
            placeholder="Título do lote"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            style={gdInputStyle}
            placeholder="IDs dos documentos (separados por vírgula)"
            value={docIds}
            onChange={(e) => setDocIds(e.target.value)}
          />
          <button type="button" style={gdBtnStyle} onClick={criar}>
            Criar lote
          </button>
        </div>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Lotes
        </h2>
        {loading ? <p>Carregando...</p> : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {batches.map((b) => (
            <li
              key={b.id}
              style={{
                borderTop: "1px solid #334155",
                padding: "10px 0",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => carregarDetalhe(b.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#e5e7eb",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <strong>{b.title}</strong> · {b.status} · {b.progress_done}/
                {b.progress_total}
              </button>
              <button
                type="button"
                style={{ ...gdBtnStyle, background: "#7f1d1d" }}
                onClick={() => excluir(b.id)}
              >
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedId ? (
        <div style={gdCardStyle}>
          <h2 className="admin-h2" style={{ marginTop: 0 }}>
            Detalhe do lote
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button type="button" style={gdBtnStyle} onClick={() => atualizarStatus("ready")}>
              Marcar pronto
            </button>
            <button type="button" style={gdBtnStyle} onClick={() => atualizarStatus("running")}>
              Em execução
            </button>
            <button type="button" style={gdBtnStyle} onClick={() => atualizarStatus("paused")}>
              Pausar
            </button>
            <button type="button" style={gdBtnStyle} onClick={() => atualizarStatus("completed")}>
              Concluir
            </button>
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#0f766e" }}
              onClick={autorizarLote}
            >
              Autorizar sessão gov.br
            </button>
          </div>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                #{item.sort_order} · {item.document_id.slice(0, 8)}… · {item.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </GestaoDocumentalShell>
  );
}
