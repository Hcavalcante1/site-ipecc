"use client";

import { useCallback, useEffect, useState } from "react";
import type { GdFolder } from "@/lib/documentos/types";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";

export default function PastasPage() {
  const [folders, setFolders] = useState<GdFolder[]>([]);
  const [name, setName] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documentos/pastas", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setFolders(json.folders || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar pastas.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function criar() {
    const res = await fetch("/api/admin/documentos/pastas", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao criar pasta.");
      return;
    }
    setName("");
    carregar();
  }

  async function remover(id: string) {
    const ok = await confirmAction("Mover pasta para a lixeira?");
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm("Mover pasta para a lixeira?")) return;
      else if (isConfirmModalReady()) return;
    }
    const res = await fetch(`/api/admin/documentos/pastas?id=${id}`, {
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
      title="Pastas"
      description="Organize documentos em pastas por processo."
    >
      <div style={gdCardStyle}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            style={{ ...gdInputStyle, maxWidth: 320 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da pasta"
          />
          <button
            type="button"
            style={gdBtnStyle}
            disabled={!name.trim()}
            onClick={criar}
          >
            Criar pasta
          </button>
        </div>
      </div>

      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b", color: "#fde68a" }}>
          {aviso}
        </div>
      ) : null}

      {loading ? (
        <p>Carregando...</p>
      ) : folders.length === 0 ? (
        <div style={gdCardStyle}>Nenhuma pasta cadastrada.</div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {folders.map((f) => (
            <div
              key={f.id}
              style={{
                ...gdCardStyle,
                marginTop: 0,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <strong>{f.name}</strong>
              <button
                type="button"
                style={{ ...gdBtnStyle, background: "#ef4444" }}
                onClick={() => remover(f.id)}
              >
                Lixeira
              </button>
            </div>
          ))}
        </div>
      )}
    </GestaoDocumentalShell>
  );
}
