"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { GdDocument } from "@/lib/documentos/types";
import { rotuloStatus } from "@/lib/documentos/labels";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
} from "../components/GestaoDocumentalShell";

export default function LixeiraPage() {
  const [documents, setDocuments] = useState<GdDocument[]>([]);
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documentos?deleted=1", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setDocuments(json.documents || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar lixeira.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function esvaziar() {
    const ok = await confirmAction("Excluir permanentemente TODOS os documentos da lixeira? Esta ação não pode ser desfeita.");
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm("Excluir permanentemente TODOS os documentos da lixeira? Esta ação não pode ser desfeita.")) return;
      else if (isConfirmModalReady()) return;
    }
    const res = await fetch("/api/admin/documentos?esvaziar=1", {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro ao esvaziar lixeira.", "error");
      return;
    }
    triggerToast(
      json.deleted
        ? `${json.deleted} documento(s) excluído(s) permanentemente.`
        : "Lixeira já estava vazia.",
      "success"
    );
    carregar();
  }

  async function restaurar(id: string) {
    const res = await fetch(`/api/admin/documentos/${id}/restaurar`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro ao restaurar.", "error");
      return;
    }
    carregar();
  }

  return (
    <GestaoDocumentalShell
      title="Lixeira"
      description="Documentos removidos (soft delete). Dá para restaurar."
      actions={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {documents.length > 0 && (
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#7f1d1d" }}
              onClick={esvaziar}
            >
              Esvaziar lixeira
            </button>
          )}
          <Link href="/admin/documentos/documentos" style={gdBtnStyle}>
            Voltar aos documentos
          </Link>
        </div>
      }
    >
      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b", color: "#fde68a" }}>
          {aviso}
        </div>
      ) : null}

      {loading ? (
        <p>Carregando...</p>
      ) : documents.length === 0 ? (
        <div style={gdCardStyle}>Lixeira vazia.</div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                ...gdCardStyle,
                marginTop: 0,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>{doc.title}</strong>
                <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.85 }}>
                  {rotuloStatus(doc.status)}
                  {doc.deleted_at
                    ? ` · excluído em ${new Date(doc.deleted_at).toLocaleString("pt-BR")}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                style={gdBtnStyle}
                onClick={() => restaurar(doc.id)}
              >
                Restaurar
              </button>
            </div>
          ))}
        </div>
      )}
    </GestaoDocumentalShell>
  );
}
