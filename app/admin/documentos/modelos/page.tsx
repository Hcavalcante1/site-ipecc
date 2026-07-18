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

const introCardStyle = {
  ...gdCardStyle,
  display: "grid",
  gap: 12,
};

const stepNavStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
};

const stepNavBtnStyle = (active: boolean) => ({
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${active ? "#60a5fa" : "#334155"}`,
  background: active ? "rgba(37,99,235,0.18)" : "rgba(255,255,255,0.04)",
  color: active ? "#dbeafe" : "#cbd5e1",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
});

const panelStyle = {
  padding: 16,
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.26)",
  background: "rgba(255,255,255,0.03)",
  boxShadow: "0 8px 22px rgba(2, 6, 23, 0.12)",
  display: "grid",
  gap: 14,
  marginTop: 16,
};

const panelHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap" as const,
};

const stepLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(37,99,235,0.16)",
  color: "#bfdbfe",
  fontSize: 12,
  fontWeight: 700,
};

const stepHintStyle = {
  margin: 0,
  color: "#cbd5e1",
  opacity: 0.9,
  fontSize: 13,
  maxWidth: 420,
};

const paperPreviewStyle = {
  padding: 20,
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "#ffffff",
  color: "#0f172a",
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.65,
  fontSize: 13,
  maxHeight: 430,
  overflow: "auto",
  boxShadow: "0 14px 36px rgba(15,23,42,0.14)",
};

const kindGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
};

const kindCardStyle = (active: boolean) => ({
  textAlign: "left" as const,
  padding: 14,
  borderRadius: 16,
  border: `1px solid ${active ? "#60a5fa" : "#334155"}`,
  background: active
    ? "linear-gradient(180deg, rgba(37,99,235,0.20), rgba(37,99,235,0.10))"
    : "rgba(255,255,255,0.04)",
  color: "#e5e7eb",
  cursor: "pointer",
  boxShadow: active ? "0 0 0 1px rgba(96,165,250,0.18)" : "none",
});

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
    help: "Instrumento jurídico com cláusulas numeradas.",
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

const ETAPAS = [
  { id: 1 as const, titulo: "Capa", sub: "Nome do modelo" },
  { id: 2 as const, titulo: "Modalidade", sub: "Escolha da peça" },
  { id: 3 as const, titulo: "Campos mínimos", sub: "Dados variáveis" },
  { id: 4 as const, titulo: "Prévia", sub: "Minuta pronta" },
] as const;

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
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);

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
  const kindLabel = useMemo(() => rotuloTipoModelo(kind), [kind]);
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

  function selecionarKind(v: GdTemplateKind) {
    setKind(v);
    setFieldValues(getDefaultGdTemplateFieldValues());
  }

  async function salvar() {
    if (!name.trim()) {
      setAviso("Informe o nome do modelo.");
      return;
    }

    if (!bodyToSave) {
      setAviso("O corpo do modelo nao pode ficar vazio.");
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
    setEtapa(1);
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

  function renderEtapa() {
    if (etapa === 1) {
      return (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <span style={stepLabelStyle}>1. Capa</span>
              <h3 style={{ margin: "8px 0 0" }}>Identificação do modelo</h3>
            </div>
            <p style={stepHintStyle}>
              Nomeie a peça e mantenha o padrão institucional do IPECC.
            </p>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label>Nome do modelo</label>
              <input
                style={{ ...gdInputStyle, marginTop: 0, maxWidth: 640 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Contrato padrao de parceria"
              />
            </div>
            <p style={{ margin: 0, opacity: 0.76, fontSize: 13 }}>
              O formato tecnico e o texto-base sao definidos pelo tipo escolhido
              na etapa seguinte.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={gdBtnStyle} onClick={() => setEtapa(2)}>
              Continuar
            </button>
          </div>
        </div>
      );
    }

    if (etapa === 2) {
      return (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <span style={stepLabelStyle}>2. Modalidade</span>
              <h3 style={{ margin: "8px 0 0" }}>Escolha a peça juridica</h3>
            </div>
            <p style={stepHintStyle}>
              Selecione uma modalidade para carregar o corpo institucional
              correspondente.
            </p>
          </div>

          <div style={kindGridStyle}>
            {kindOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => selecionarKind(opt.value)}
                style={kindCardStyle(kind === opt.value)}
              >
                <strong style={{ display: "block", marginBottom: 4 }}>
                  {opt.label}
                </strong>
                <span style={{ fontSize: 12, opacity: 0.82 }}>{opt.help}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={gdBtnStyle}
              onClick={() => setEtapa(1)}
            >
              Voltar
            </button>
            <button
              type="button"
              style={gdBtnStyle}
              onClick={() => setEtapa(3)}
            >
              Continuar
            </button>
          </div>
        </div>
      );
    }

    if (etapa === 3) {
      return (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <span style={stepLabelStyle}>3. Campos mínimos</span>
              <h3 style={{ margin: "8px 0 0" }}>Dados variáveis da peça</h3>
            </div>
            <p style={stepHintStyle}>
              Preencha somente o que muda em cada documento. O restante ja vem
              estruturado no modelo.
            </p>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {fieldConfigs.map((field) => {
              const value = fieldValues[field.key] || "";
              return (
                <div
                  key={field.key}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,0.22)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
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
                        onChange={(e) =>
                          atualizarCampo(field.key, e.target.value)
                        }
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        style={{
                          ...gdInputStyle,
                          marginTop: 0,
                          maxWidth: 640,
                        }}
                        value={value}
                        onChange={(e) =>
                          atualizarCampo(field.key, e.target.value)
                        }
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.help ? (
                      <small style={{ opacity: 0.72 }}>{field.help}</small>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={gdBtnStyle}
              onClick={() => setEtapa(2)}
            >
              Voltar
            </button>
            <button
              type="button"
              style={gdBtnStyle}
              onClick={() => setEtapa(4)}
            >
              Continuar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <span style={stepLabelStyle}>4. Prévia</span>
            <h3 style={{ margin: "8px 0 0" }}>Minuta gerada</h3>
          </div>
          <p style={stepHintStyle}>
            A minuta aparece pronta para leitura, revisão e assinatura.
          </p>
        </div>

        <div style={paperPreviewStyle}>{generatedBody}</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={gdBtnStyle}
            onClick={() => setEtapa(3)}
          >
            Voltar
          </button>
          <button type="button" style={gdBtnStyle} onClick={salvar}>
            {editingId ? "Salvar alteracoes" : "Criar modelo"}
          </button>
          {editingId ? (
            <button
              type="button"
              style={gdDangerBtnStyle}
              onClick={limparForm}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <GestaoDocumentalShell
      title="Modelos"
      description="Fluxo guiado no estilo CGU: capa, modalidade, campos minimos e minuta final."
    >
      <div style={introCardStyle}>
        <div>
          <h2 className="admin-h2" style={{ marginTop: 0 }}>
            Fluxo guiado do modelo
          </h2>
          <p style={{ marginTop: 0, marginBottom: 0, opacity: 0.86 }}>
            O texto institucional ja vem montado. Voce avanca de etapa em etapa
            e altera apenas os campos variaveis do caso.
          </p>
        </div>

        <div style={stepNavStyle} aria-label="Etapas do formulario">
          {ETAPAS.map((item) => (
            <button
              key={item.id}
              type="button"
              style={stepNavBtnStyle(etapa === item.id)}
              onClick={() => setEtapa(item.id)}
            >
              {item.titulo}
            </button>
          ))}
        </div>
      </div>

      {renderEtapa()}

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
