"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";

type Signer = {
  id: string;
  name: string;
  email: string | null;
  document_id: string | null;
  batch_id: string | null;
  mode: string;
  status: string;
  sort_order: number;
};

export default function SignatariosPage() {
  const search = useSearchParams();
  const [signers, setSigners] = useState<Signer[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [mode, setMode] = useState<"parallel" | "sequential">("parallel");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (documentId.trim()) qs.set("document_id", documentId.trim());
    if (batchId.trim()) qs.set("batch_id", batchId.trim());
    const res = await fetch(
      `/api/admin/documentos/signatarios${qs.toString() ? `?${qs}` : ""}`,
      { credentials: "include" }
    );
    const json = await res.json();
    if (res.ok) {
      setSigners(json.signers || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar signatários.");
    }
    setLoading(false);
  }, [documentId, batchId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const docId = search.get("document_id")?.trim() || "";
    const loteId = search.get("batch_id")?.trim() || "";
    if (docId) setDocumentId(docId);
    if (loteId) setBatchId(loteId);
  }, [search]);

  async function criar() {
    const res = await fetch("/api/admin/documentos/signatarios", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: email || null,
        document_id: documentId.trim() || null,
        batch_id: batchId.trim() || null,
        mode,
        sort_order: signers.length,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao adicionar signatário.");
      return;
    }
    setName("");
    setEmail("");
    setAviso("Signatário adicionado.");
    carregar();
  }

  async function marcar(id: string, status: string) {
    const res = await fetch("/api/admin/documentos/signatarios", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao atualizar.");
      return;
    }
    carregar();
  }

  async function remover(id: string) {
    const ok = await confirmAction("Remover este signatário?");
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm("Remover este signatário?")) return;
      else if (isConfirmModalReady()) return;
    }
    const res = await fetch(`/api/admin/documentos/signatarios?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao remover.");
      return;
    }
    carregar();
  }

  return (
    <GestaoDocumentalShell
      title="Signatários"
      description="Cadastro e ordem de signatários vinculados a um documento ou lote."
    >
      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b" }}>{aviso}</div>
      ) : null}

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Novo signatário
        </h2>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.85 }}>
          Você pode vincular o signatário a um documento ou lote já aberto.
          Se vier da ficha, o identificador entra sozinho.
        </p>
        <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
          <input
            style={gdInputStyle}
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            style={gdInputStyle}
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            style={gdInputStyle}
            value={mode}
            onChange={(e) =>
              setMode(e.target.value === "sequential" ? "sequential" : "parallel")
            }
          >
            <option value="parallel">Paralelo</option>
            <option value="sequential">Sequencial</option>
          </select>
          <button type="button" style={gdBtnStyle} onClick={criar}>
            Vincular signatário
          </button>
          <details style={{ marginTop: 4 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, opacity: 0.85 }}>
              Vinculação manual
            </summary>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <input
                style={gdInputStyle}
                placeholder="Identificador interno do documento"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
              />
              <input
                style={gdInputStyle}
                placeholder="Identificador interno do lote"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              />
              <small style={{ opacity: 0.8 }}>
                Use apenas se não vier da ficha do documento ou do lote.
              </small>
            </div>
          </details>
        </div>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Lista
        </h2>
        {loading ? <p>Carregando...</p> : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {signers.map((s) => (
            <li
              key={s.id}
              style={{
                borderTop: "1px solid #334155",
                padding: "10px 0",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>{s.name}</strong> · {s.status} · {s.mode}
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {s.email || "sem e-mail"}
                  {s.document_id ? ` · doc ${s.document_id.slice(0, 8)}…` : ""}
                  {s.batch_id ? ` · lote ${s.batch_id.slice(0, 8)}…` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={gdBtnStyle}
                  onClick={() => marcar(s.id, "notified")}
                >
                  Notificar
                </button>
                <button
                  type="button"
                  style={{ ...gdBtnStyle, background: "#0f766e" }}
                  onClick={() => marcar(s.id, "signed")}
                >
                  Assinou
                </button>
                <button
                  type="button"
                  style={{ ...gdBtnStyle, background: "#7f1d1d" }}
                  onClick={() => remover(s.id)}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </GestaoDocumentalShell>
  );
}
