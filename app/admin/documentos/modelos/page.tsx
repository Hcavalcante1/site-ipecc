"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  buildGdTemplateBody,
  getDefaultGdTemplateFieldValues,
  getGdTemplateFieldConfigs,
  type GdTemplateFieldKey,
  type GdTemplateFieldValues,
} from "@/lib/documentos/templatePresets";
import TipoDocumentoField from "@/components/admin/TipoDocumentoField";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";

const gdDangerBtnStyle = {
  ...gdBtnStyle,
  padding: "6px 12px",
  fontSize: 12,
  background: "linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)",
  boxShadow: "none",
};

const sectionStyle = {
  display: "grid",
  gap: 10,
  marginTop: 12,
};

const previewStyle = {
  marginTop: 12,
  padding: 16,
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "#ffffff",
  color: "#0f172a",
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.55,
  fontSize: 13,
  maxHeight: 340,
  overflow: "auto",
  boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
};

const fieldWrapStyle = {
  display: "grid",
  gap: 6,
};

export default function ModelosPage() {
  const [templates, setTemplates] = useState<GdDocumentTemplate[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GdTemplateKind>("contrato");
  const [format, setFormat] = useState<GdTemplateFormat>("pdf");
  const [fieldValues, setFieldValues] = useState<GdTemplateFieldValues>(
    getDefaultGdTemplateFieldValues()
  );
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

  const fieldConfigs = useMemo(() => getGdTemplateFieldConfigs(kind), [kind]);
  const generatedBody = useMemo(
    () => buildGdTemplateBody(kind, name, fieldValues),
    [kind, name, fieldValues]
  );
  const bodyToSave = generatedBody.trim();

  function limparForm() {
    setName("");
    setKind("contrato");
    setFormat("pdf");
    setFieldValues(getDefaultGdTemplateFieldValues());
    setEditingId(null);
  }

  function atualizarCampo(key: GdTemplateFieldKey, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  function alterarKind(v: GdTemplateKind) {
    setKind(v);
    setFieldValues(getDefaultGdTemplateFieldValues());
  }

  async function salvar() {
    if (!name.trim()) {
      setAviso("Informe o nome do modelo.");
      return;
    }

    if (!bodyToSave) {
      setAviso("O corpo do modelo não pode ficar vazio.");
      return;
    }

    if (editingId) {
      const res = await fetch("/api/admin/documentos/modelos", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name,
          kind,
          format,
          body: bodyToSave,
        }),
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
        body: JSON.stringify({
          name,
          kind,
          format,
          body: bodyToSave,
        }),
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
    setFieldValues(getDefaultGdTemplateFieldValues());
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
      description="Formulário guiado no molde CGU: o texto institucional vem pronto e você altera só os campos específicos."
    >
      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          {editingId ? "Editar modelo" : "Novo modelo"}
        </h2>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Preencha apenas o que muda de um documento para outro. O restante já
          sai no padrão institucional.
        </p>

        <div style={sectionStyle}>
          <div style={fieldWrapStyle}>
            <label>Nome do modelo</label>
            <input
              style={{ ...gdInputStyle, marginTop: 0, maxWidth: 640 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Contrato padrão de parceria"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 1fr) minmax(180px, 220px)",
              gap: 12,
            }}
          >
            <div style={fieldWrapStyle}>
              <label>Tipo</label>
              <div style={{ marginTop: 0 }}>
                <TipoDocumentoField
                  value={kind}
                  onChange={(v) => alterarKind(v)}
                  para="emissao"
                  valueMode="codigo"
                  selectStyle={{
                    ...gdInputStyle,
                    display: "block",
                    width: "100%",
                    maxWidth: 640,
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
            <div style={fieldWrapStyle}>
              <label>Formato</label>
              <select
                style={{ ...gdInputStyle, marginTop: 0, display: "block" }}
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
        </div>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Campos específicos do modelo
        </h2>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          O corpo jurídico, administrativo e institucional já vem montado.
          Altere só os campos mínimos deste tipo de peça.
        </p>

        <div style={sectionStyle}>
          {fieldConfigs.map((field) => {
            const value = fieldValues[field.key] || "";
            return (
              <div key={field.key} style={fieldWrapStyle}>
                <label>{field.label}</label>
                {field.multiline ? (
                  <textarea
                    style={{
                      ...gdInputStyle,
                      marginTop: 0,
                      minHeight: field.rows ? field.rows * 20 : 72,
                      maxWidth: "100%",
                    }}
                    value={value}
                    onChange={(e) => atualizarCampo(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    style={{ ...gdInputStyle, marginTop: 0, maxWidth: 640 }}
                    value={value}
                    onChange={(e) => atualizarCampo(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
                {field.help ? (
                  <small style={{ opacity: 0.72 }}>{field.help}</small>
                ) : null}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14 }}>
          <strong>Prévia gerada</strong>
          <div style={previewStyle}>{generatedBody}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <button type="button" style={gdBtnStyle} onClick={salvar}>
            {editingId ? "Salvar alterações" : "Criar modelo"}
          </button>
          {editingId ? (
            <button type="button" style={gdDangerBtnStyle} onClick={limparForm}>
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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={gdBtnStyle}
                  onClick={() => editar(t)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  style={gdDangerBtnStyle}
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
