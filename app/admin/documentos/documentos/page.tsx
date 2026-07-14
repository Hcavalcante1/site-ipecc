"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { GdCategory, GdDocument, GdFolder } from "@/lib/documentos/types";
import { GD_DOCUMENT_STATUSES } from "@/lib/documentos/types";
import { rotuloStatus } from "@/lib/documentos/labels";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";

export default function DocumentosListaPage() {
  const [documents, setDocuments] = useState<GdDocument[]>([]);
  const [folders, setFolders] = useState<GdFolder[]>([]);
  const [categories, setCategories] = useState<GdCategory[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (favoriteOnly) params.set("favorite", "1");
    if (folderId) params.set("folder_id", folderId);
    if (categoryId) params.set("category_id", categoryId);
    const res = await fetch(
      `/api/admin/documentos${params.toString() ? `?${params}` : ""}`,
      { credentials: "include" }
    );
    const json = await res.json();
    if (res.ok) {
      setDocuments(json.documents || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao listar documentos.");
      setDocuments([]);
    }
    setLoading(false);
  }, [q, status, favoriteOnly, folderId, categoryId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/documentos/pastas", { credentials: "include" }).then(
        (r) => r.json()
      ),
      fetch("/api/admin/documentos/categorias", {
        credentials: "include",
      }).then((r) => r.json()),
    ]).then(([p, c]) => {
      setFolders(p.folders || []);
      setCategories(c.categories || []);
    });
  }, []);

  async function excluir(id: string) {
    if (!confirm("Mover este documento para a lixeira?")) return;
    const res = await fetch(`/api/admin/documentos/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Erro ao excluir.");
      return;
    }
    carregar();
  }

  async function favoritar(doc: GdDocument) {
    const res = await fetch(`/api/admin/documentos/${doc.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !doc.favorite }),
    });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error || "Erro ao favoritar.");
      return;
    }
    carregar();
  }

  async function arquivar(id: string) {
    const res = await fetch(`/api/admin/documentos/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error || "Erro ao arquivar.");
      return;
    }
    carregar();
  }

  async function duplicar(id: string) {
    const res = await fetch(`/api/admin/documentos/${id}/duplicar`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Erro ao duplicar.");
      return;
    }
    window.location.href = `/admin/documentos/documentos/${json.document.id}`;
  }

  return (
    <GestaoDocumentalShell
      title="Documentos"
      description="Busca, filtros, favoritos, arquivamento e lixeira."
      actions={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/documentos/lixeira" style={{ ...gdBtnStyle, background: "#334155" }}>
            Lixeira
          </Link>
          <Link href="/admin/documentos/documentos/novo" style={gdBtnStyle}>
            Novo documento
          </Link>
        </div>
      }
    >
      <div style={{ ...gdCardStyle, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            style={{ ...gdInputStyle, maxWidth: 280 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Título, número ou descrição"
          />
          <select
            style={{ ...gdInputStyle, maxWidth: 200 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {GD_DOCUMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {rotuloStatus(s)}
              </option>
            ))}
          </select>
          <select
            style={{ ...gdInputStyle, maxWidth: 180 }}
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          >
            <option value="">Todas as pastas</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            style={{ ...gdInputStyle, maxWidth: 180 }}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={favoriteOnly}
            onChange={(e) => setFavoriteOnly(e.target.checked)}
          />
          Somente favoritos
        </label>
      </div>

      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b", color: "#fde68a" }}>
          {aviso}
        </div>
      ) : null}

      {loading ? (
        <p style={{ marginTop: 16 }}>Carregando...</p>
      ) : documents.length === 0 ? (
        <div style={gdCardStyle}>
          Nenhum documento encontrado com os filtros atuais.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                ...gdCardStyle,
                marginTop: 0,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Link
                  href={`/admin/documentos/documentos/${doc.id}`}
                  style={{ color: "#93c5fd", fontWeight: 700 }}
                >
                  {doc.favorite ? "★ " : ""}
                  {doc.title}
                </Link>
                <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.85 }}>
                  {rotuloStatus(doc.status)}
                  {doc.current_version
                    ? ` · v${doc.current_version}`
                    : " · sem arquivo"}
                  {doc.number ? ` · nº ${doc.number}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={{ ...gdBtnStyle, background: "#334155" }}
                  onClick={() => favoritar(doc)}
                  title={doc.favorite ? "Remover favorito" : "Favoritar"}
                >
                  {doc.favorite ? "★" : "☆"}
                </button>
                <Link
                  href={`/admin/documentos/documentos/${doc.id}`}
                  style={{ ...gdBtnStyle, background: "#334155" }}
                >
                  Abrir
                </Link>
                {doc.storage_path || doc.current_version ? (
                  <Link
                    href={`/admin/documentos/assinaturas?document_id=${encodeURIComponent(doc.id)}&auto=1`}
                    style={{ ...gdBtnStyle, background: "#0f766e" }}
                  >
                    Assinar
                  </Link>
                ) : null}
                <button
                  type="button"
                  style={{ ...gdBtnStyle, background: "#475569" }}
                  onClick={() => duplicar(doc.id)}
                >
                  Duplicar
                </button>
                {doc.status !== "archived" ? (
                  <button
                    type="button"
                    style={{ ...gdBtnStyle, background: "#64748b" }}
                    onClick={() => arquivar(doc.id)}
                  >
                    Arquivar
                  </button>
                ) : null}
                <button
                  type="button"
                  style={{ ...gdBtnStyle, background: "#ef4444" }}
                  onClick={() => excluir(doc.id)}
                >
                  Lixeira
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GestaoDocumentalShell>
  );
}
