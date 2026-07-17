"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  GdDocumentTemplate,
  GdTemplateFormat,
  GdTemplateKind,
} from "@/lib/documentos/types";
import { rotuloTipoModelo } from "@/lib/documentos/labels";
import {
  buildGdTemplateBody,
  getDefaultGdTemplateFieldValues,
  getGdTemplateFieldConfigs,
  type GdTemplateFieldKey,
  type GdTemplateFieldValues,
} from "@/lib/documentos/templatePresets";
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

const wizardStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
  marginBottom: 14,
};

const wizardChipStyle = (active: boolean) => ({
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${active ? "#2563eb" : "#334155"}`,
  background: active ? "rgba(37,99,235,0.16)" : "rgba(255,255,255,0.04)",
  color: active ? "#dbeafe" : "#cbd5e1",
  fontSize: 12,
  fontWeight: 700,
});

const stepCardStyle = (active: boolean) => ({
  padding: 14,
  borderRadius: 14,
  border: `1px solid ${active ? "rgba(37,99,235,0.45)" : "rgba(148,163,184,0.25)"}`,
  background: active ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.03)",
  boxShadow: active ? "0 8px 22px rgba(37,99,235,0.10)" : "none",
});

const kindCardGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
};

const sectionStyle = {
  display: "grid",
  gap: 10,
  marginTop: 12,
};

const previewStyle = {
  marginTop: 12,
  padding: 18,
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "#ffffff",
  color: "#0f172a",
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.6,
  fontSize: 13,
  maxHeight: 380,
  overflow: "auto",
  boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
};

const fieldWrapStyle = {
  display: "grid",
  gap: 6,
};

const notesStyle = {
  marginTop: 16,
  padding: 16,
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(248,250,252,0.9)",
  color: "#0f172a",
};

const kindOptions: Array<{ value: GdTemplateKind; label: string; help: string }> = [
  {
    value: "oficio",
    label: "Ofício",
    help: "Comunicação formal com destinatário, assunto e fecho.",
  },
  {
    value: "declaracao",
    label: "Declaração",
    help: "Texto declaratório com finalidade e validade.",
  },
  {
    value: "contrato",
    label: "Contrato",
    help: "Instrumento jurídico com partes, objeto e vigência.",
  },
  {
    value: "convenio",
    label: "Convênio",
    help: "Instrumento de cooperação institucional.",
  },
  {
    value: "termo",
    label: "Termo",
    help: "Termo institucional ou de ajuste.",
  },
  {
    value: "ata",
    label: "Ata",
    help: "Registro formal de reunião ou deliberação.",
  },
  {
    value: "relatorio",
    label: "Relatório",
    help: "Resumo técnico com achados e conclusão.",
  },
  {
    value: "plano_trabalho",
    label: "Plano de trabalho",
    help: "Objetivos, metas, prazo e resultados esperados.",
  },
  {
    value: "prestacao_contas",
    label: "Prestação de contas",
    help: "Execução, conformidade e encerramento.",
  },
  {
    value: "outro",
    label: "Outro",
    help: "Modelo genérico institucional.",
  },
];

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
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);

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
    setEtapa(1);
  }

  function atualizarCampo(key: GdTemplateFieldKey, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  function alterarKind(v: GdTemplateKind) {
    setKind(v);
    setFieldValues(getDefaultGdTemplateFieldValues());
    setEtapa(2);
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
    setEtapa(2);
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

        <div style={wizardStyle} aria-label="Etapas do formulário">
          <button
            type="button"
            style={wizardChipStyle(etapa === 1)}
            onClick={() => setEtapa(1)}
          >
            1. Capa
          </button>
          <button
            type="button"
            style={wizardChipStyle(etapa === 2)}
            onClick={() => setEtapa(2)}
          >
            2. Dados específicos
          </button>
          <button
            type="button"
            style={wizardChipStyle(etapa === 3)}
            onClick={() => setEtapa(3)}
          >
            3. Minuta
          </button>
        </div>

        {etapa === 1 ? (
          <div style={stepCardStyle(true)}>
            <strong style={{ display: "block", marginBottom: 6 }}>
              Capa do modelo
            </strong>
            <p style={{ marginTop: 0, opacity: 0.85 }}>
              Escolha o tipo da peça e informe o nome do modelo. O sistema já
              assume o formato institucional padrão.
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
              <div style={fieldWrapStyle}>
                <label>Tipo do documento</label>
                <div style={kindCardGridStyle}>
                  {kindOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => alterarKind(opt.value)}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 14,
                        border: `1px solid ${kind === opt.value ? "#2563eb" : "#334155"}`,
                        background:
                          kind === opt.value
                            ? "rgba(37,99,235,0.14)"
                            : "rgba(255,255,255,0.04)",
                        color: "#e5e7eb",
                        cursor: "pointer",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: 4 }}>
                        {opt.label}
                      </strong>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>{opt.help}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Campos específicos do modelo
        </h2>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          O corpo jurídico, administrativo e institucional já vem montado.
          Altere só os campos mínimos deste tipo de peça.
        </p>

        {etapa === 2 ? (
          <div style={{ ...stepCardStyle(true), display: "grid", gap: 12 }}>
            <div>
              <strong style={{ display: "block", marginBottom: 6 }}>
                Dados específicos da peça
              </strong>
              <p style={{ margin: 0, opacity: 0.82 }}>
                Esta etapa concentra apenas as informações variáveis do caso.
                O texto-base institucional fica embutido na minuta final.
              </p>
            </div>

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
                        minHeight: field.rows ? field.rows * 16 : 64,
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
        ) : null}

        {etapa === 3 ? (
          <div style={{ marginTop: 14 }}>
            <strong style={{ display: "block", marginBottom: 8 }}>
              Minuta final
            </strong>
            <div style={previewStyle}>{generatedBody}</div>
            <div style={notesStyle}>
              <strong style={{ display: "block", marginBottom: 6 }}>
                Notas explicativas - leitura obrigatória
              </strong>
              <p style={{ marginTop: 0, marginBottom: 8 }}>
                O documento deve manter a redação institucional e apenas
                adaptar o que for específico do caso concreto, seguindo o
                mesmo espírito do formulário guiado da CGU.
              </p>
              <p style={{ margin: 0 }}>
                Depois de aprovado internamente, a minuta segue para assinatura
                e publicação/arquivo conforme o fluxo do módulo.
              </p>
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 14,
          }}
        >
          {etapa > 1 ? (
            <button
              type="button"
              style={gdBtnStyle}
              onClick={() => setEtapa((p) => (p - 1) as 1 | 2 | 3)}
            >
              Voltar
            </button>
          ) : null}
          {etapa < 3 ? (
            <button
              type="button"
              style={gdBtnStyle}
              onClick={() => setEtapa((p) => (p + 1) as 1 | 2 | 3)}
            >
              Continuar
            </button>
          ) : null}
          {etapa === 3 ? (
            <button type="button" style={gdBtnStyle} onClick={salvar}>
              {editingId ? "Salvar alterações" : "Criar modelo"}
            </button>
          ) : null}
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
