"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  GdDocumentTemplate,
  GdTemplateFormat,
  GdTemplateKind,
} from "@/lib/documentos/types";
import {
  GD_TEMPLATE_FORMATS,
  GD_TEMPLATE_KINDS,
} from "@/lib/documentos/types";
import { rotuloTipoModelo } from "@/lib/documentos/labels";
import TipoDocumentoField from "@/components/admin/TipoDocumentoField";
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
      description="Cadastro de modelos. O tipo vem do catálogo (pode criar novos: ata, declaração, etc.)."
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
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <div style={{ flex: "1 1 280px" }}>
            <label>Tipo</label>
            <div style={{ marginTop: 6 }}>
              <TipoDocumentoField
                value={kind}
                onChange={(v) => setKind(v)}
                para="emissao"
                valueMode="codigo"
                selectStyle={{
                  ...gdInputStyle,
                  display: "block",
                  width: "100%",
                }}
                extraOptions={GD_TEMPLATE_KINDS.map((k) => ({
                  codigo: k,
                  label: rotuloTipoModelo(k),
                }))}
                createDefaults={{
                  para_publicacao: false,
                  para_emissao: true,
                  para_prestacao: false,
                  criar_modelo: false,
                }}
              />
            </div>
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
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={gdBtnStyle} onClick={salvar}>
            {editingId ? "Salvar alterações" : "Criar modelo"}
          </button>
          {editingId ? (
            <button type="button" style={gdBtnStyle} onClick={limparForm}>
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Modelos cadastrados
        </h2>
        {loading ? <p>Carregando...</p> : null}
        {aviso ? <p>{aviso}</p> : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {templates.map((t) => (
            <li
              key={t.id}
              style={{
                borderTop: "1px solid #334155",
                padding: "12px 0",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              <div>
                <strong>{t.name}</strong>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {rotuloTipoModelo(t.kind)} · {t.format}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={gdBtnStyle}
                  onClick={() => editar(t)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  style={gdBtnStyle}
                  onClick={() => remover(t.id)}
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
