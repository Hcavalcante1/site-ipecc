"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { GdCategory, GdDocument, GdFolder } from "@/lib/documentos/types";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [excluindoLote, setExcluindoLote] = useState(false);

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
    const ok = await confirmAction("Mover este documento para a lixeira?");
    if (!ok) {
      if (!isConfirmModalReady() && !window.confirm("Mover este documento para a lixeira?")) return;
      else if (isConfirmModalReady()) return;
    }
    const res = await fetch(`/api/admin/documentos/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      triggerToast(json.error || "Erro ao excluir.", "error");
      return;
    }
    carregar();
  }

  async function excluirSelecionados() {
    if (selected.size === 0) return;
    const okLote = await confirmAction(`Mover ${selected.size} documento(s) para a lixeira?`);
    if (!okLote) {
      if (!isConfirmModalReady() && !window.confirm(`Mover ${selected.size} documento(s) para a lixeira?`)) return;
      else if (isConfirmModalReady()) return;
    }
    setExcluindoLote(true);
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/admin/documentos/${id}`, {
          method: "DELETE",
          credentials: "include",
        })
      )
    );
    setSelected(new Set());
    setExcluindoLote(false);
    carregar();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (selected.size === documents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((d) => d.id)));
    }
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
      triggerToast(json.error || "Erro ao favoritar.", "error");
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
      triggerToast(json.error || "Erro ao arquivar.", "error");
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
      triggerToast(json.error || "Erro ao duplicar.", "error");
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
          {selected.size > 0 && (
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#7f1d1d" }}
              onClick={excluirSelecionados}
              disabled={excluindoLote}
            >
              {excluindoLote ? "Excluindo…" : `Lixeira (${selected.size})`}
            </button>
          )}
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
        <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              opacity: 0.75,
              cursor: "pointer",
              userSelect: "none",
              padding: "4px 0",
            }}
          >
            <input
              type="checkbox"
              checked={selected.size === documents.length && documents.length > 0}
              onChange={toggleTodos}
            />
            Selecionar todos ({documents.length})
          </label>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: selected.has(doc.id)
                  ? "rgba(59,130,246,0.10)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${selected.has(doc.id) ? "#3b82f6" : "#334155"}`,
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(doc.id)}
                onChange={() => toggleSelect(doc.id)}
                style={{ flexShrink: 0, cursor: "pointer", width: 16, height: 16 }}
              />
              <div style={{ flex: 1, minWidth: 180 }}>
                <Link
                  href={`/admin/documentos/documentos/${doc.id}`}
                  style={{ color: "#93c5fd", fontWeight: 600, fontSize: 14 }}
                >
                  {doc.favorite ? "★ " : ""}{doc.title}
                </Link>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                  {rotuloStatus(doc.status)}
                  {doc.current_version ? ` · v${doc.current_version}` : " · sem arquivo"}
                  {doc.number ? ` · nº ${doc.number}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => favoritar(doc)}
                  title={doc.favorite ? "Remover favorito" : "Favoritar"}
                  style={{
                    background: "transparent",
                    border: "1px solid #475569",
                    borderRadius: 6,
                    color: doc.favorite ? "#fbbf24" : "#94a3b8",
                    cursor: "pointer",
                    padding: "4px 8px",
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  {doc.favorite ? "★" : "☆"}
                </button>
                <Link
                  href={`/admin/documentos/documentos/${doc.id}`}
                  style={{
                    background: "#1e3a5f",
                    border: "none",
                    borderRadius: 6,
                    color: "#93c5fd",
                    cursor: "pointer",
                    padding: "4px 10px",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  Abrir
                </Link>
                {(doc.storage_path || doc.current_version) ? (
                  <Link
                    href={`/admin/documentos/assinaturas?document_id=${encodeURIComponent(doc.id)}`}
                    style={{
                      background: "#134e4a",
                      border: "none",
                      borderRadius: 6,
                      color: "#6ee7b7",
                      cursor: "pointer",
                      padding: "4px 10px",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Assinar
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => duplicar(doc.id)}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: 6,
                    color: "#cbd5e1",
                    cursor: "pointer",
                    padding: "4px 10px",
                    fontSize: 13,
                  }}
                >
                  Duplicar
                </button>
                {doc.status !== "archived" ? (
                  <button
                    type="button"
                    onClick={() => arquivar(doc.id)}
                    style={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: 6,
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px 10px",
                      fontSize: 13,
                    }}
                  >
                    Arquivar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => excluir(doc.id)}
                  style={{
                    background: "#450a0a",
                    border: "1px solid #7f1d1d",
                    borderRadius: 6,
                    color: "#fca5a5",
                    cursor: "pointer",
                    padding: "4px 10px",
                    fontSize: 13,
                  }}
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
