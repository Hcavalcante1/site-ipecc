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
  padding: 12,
  borderRadius: 12,
  border: "1px solid #334155",
  background: "rgba(15,23,42,0.78)",
  color: "#e5e7eb",
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.55,
  fontSize: 13,
  maxHeight: 300,
  overflow: "auto",
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
  const [rawBody, setRawBody] = useState("");
  const [advancedMode, setAdvancedMode] = useState(false);
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
  const bodyToSave = advancedMode ? rawBody.trim() : generatedBody.trim();

  function limparForm() {
    setName("");
    setKind("contrato");
    setFormat("pdf");
    setFieldValues(getDefaultGdTemplateFieldValues());
    setRawBody("");
    setAdvancedMode(false);
    setEditingId(null);
  }

  function atualizarCampo(key: GdTemplateFieldKey, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  function alterarKind(v: GdTemplateKind) {
    setKind(v);
    setFieldValues(getDefaultGdTemplateFieldValues());
    setAdvancedMode(false);
    setRawBody("");
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
    setRawBody(t.body || "");
    setAdvancedMode(true);
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
      description="Modelos pré-formatados com campos mínimos. O restante segue o padrão institucional IPECC."
    >
      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          {editingId ? "Editar modelo" : "Novo modelo"}
        </h2>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Preencha só o essencial. O sistema monta o corpo com o padrão
          institucional e deixa o restante pronto para uso.
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
          Campos variáveis do modelo
        </h2>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          O padrão institucional já vem embutido. Você altera apenas os campos
          mínimos deste tipo de documento.
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
                      minHeight: field.rows ? field.rows * 26 : 100,
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

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 14,
            fontSize: 14,
          }}
        >
          <input
            type="checkbox"
            checked={advancedMode}
            onChange={(e) => setAdvancedMode(e.target.checked)}
          />
          Editar corpo manualmente
        </label>

        {advancedMode ? (
          <div style={{ marginTop: 12 }}>
            <label>Corpo completo do modelo</label>
            <textarea
              style={{
                ...gdInputStyle,
                marginTop: 6,
                marginBottom: 12,
                minHeight: 240,
                maxWidth: "100%",
              }}
              value={rawBody}
              onChange={(e) => setRawBody(e.target.value)}
              placeholder="Edite o corpo institucional completo do documento."
            />
          </div>
        ) : null}

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
