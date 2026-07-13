"use client";

import { useCallback, useEffect, useState } from "react";
import type { GdDocumentTemplate, GdTemplateFormat, GdTemplateKind } from "@/lib/documentos/types";
import {
  GD_TEMPLATE_FORMATS,
  GD_TEMPLATE_KINDS,
} from "@/lib/documentos/types";
import { rotuloTipoModelo } from "@/lib/documentos/labels";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";

export default function ModelosPage() {
  const [templates, setTemplates] = useState<GdDocumentTemplate[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GdTemplateKind>("contrato");
  const [format, setFormat] = useState<GdTemplateFormat>("pdf");
  const [body, setBody] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documentos/modelos", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setTemplates(json.templates || []);
      setAviso(json.aviso || "");
    } else {
      setAviso(json.error || "Erro ao carregar modelos.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function limparForm() {
    setName("");
    setKind("contrato");
    setFormat("pdf");
    setBody("");
    setEditingId(null);
  }

  async function salvar() {
    if (editingId) {
      const res = await fetch("/api/admin/documentos/modelos", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name, kind, format, body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAviso(json.error || "Erro ao atualizar modelo.");
        return;
      }
    } else {
      const res = await fetch("/api/admin/documentos/modelos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind, format, body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAviso(json.error || "Erro ao criar modelo.");
        return;
      }
    }
    limparForm();
    carregar();
  }

  function editar(t: GdDocumentTemplate) {
    setEditingId(t.id);
    setName(t.name);
    setKind(t.kind);
    setFormat(t.format);
    setBody(t.body || "");
  }

  async function remover(id: string) {
    if (!confirm("Remover este modelo?")) return;
    const res = await fetch(`/api/admin/documentos/modelos?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao remover.");
      return;
    }
    if (editingId === id) limparForm();
    carregar();
  }

  return (
    <GestaoDocumentalShell
      title="Modelos"
      description="Cadastro de modelos (contrato, ofício, ata, PDF, DOCX, HTML)."
    >
      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          {editingId ? "Editar modelo" : "Novo modelo"}
        </h2>
        <label>Nome</label>
        <input
          style={{ ...gdInputStyle, marginTop: 6, marginBottom: 10 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Contrato padrão de parceria"
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <label>Tipo</label>
            <select
              style={{ ...gdInputStyle, marginTop: 6, display: "block" }}
              value={kind}
              onChange={(e) => setKind(e.target.value as GdTemplateKind)}
            >
              {GD_TEMPLATE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {rotuloTipoModelo(k)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Formato</label>
            <select
              style={{ ...gdInputStyle, marginTop: 6, display: "block" }}
              value={format}
              onChange={(e) => setFormat(e.target.value as GdTemplateFormat)}
            >
              {GD_TEMPLATE_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label>Conteúdo / corpo (HTML ou texto)</label>
        <textarea
          style={{
            ...gdInputStyle,
            marginTop: 6,
            marginBottom: 12,
            minHeight: 120,
            maxWidth: "100%",
          }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Texto-base do modelo (opcional nesta fase)"
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={gdBtnStyle}
            disabled={!name.trim()}
            onClick={salvar}
          >
            {editingId ? "Atualizar" : "Criar modelo"}
          </button>
          {editingId ? (
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#334155" }}
              onClick={limparForm}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b", color: "#fde68a" }}>
          {aviso}
        </div>
      ) : null}

      {loading ? (
        <p>Carregando...</p>
      ) : templates.length === 0 ? (
        <div style={gdCardStyle}>Nenhum modelo cadastrado.</div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {templates.map((t) => (
            <div
              key={t.id}
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
                <strong>{t.name}</strong>
                <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.85 }}>
                  {rotuloTipoModelo(t.kind)} · {t.format.toUpperCase()}
                  {t.ativo ? "" : " · inativo"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={{ ...gdBtnStyle, background: "#334155" }}
                  onClick={() => editar(t)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  style={{ ...gdBtnStyle, background: "#ef4444" }}
                  onClick={() => remover(t.id)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GestaoDocumentalShell>
  );
}
