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

const stepPanelStyle = {
  padding: 16,
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.26)",
  background: "rgba(255,255,255,0.03)",
  boxShadow: "0 8px 22px rgba(2, 6, 23, 0.12)",
  display: "grid",
  gap: 12,
  marginTop: 16,
};

const stepHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap" as const,
};

const stepLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
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

const summaryPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(125,211,252,0.26)",
  background: "rgba(15,23,42,0.55)",
  color: "#dbeafe",
  fontSize: 12,
  fontWeight: 700,
};

const kindCardGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
};

const modelKindCardStyle = (active: boolean) => ({
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

const paperPreviewStyle = {
  marginTop: 4,
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

const notesStyle = {
  marginTop: 16,
  padding: 16,
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.28)",
  background: "rgba(248,250,252,0.9)",
  color: "#0f172a",
};

const fieldWrapStyle = {
  display: "grid",
  gap: 6,
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
  const selectedKindLabel = useMemo(() => rotuloTipoModelo(kind), [kind]);
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
    setEtapa(3);
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
    setEtapa(3);
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
      description="Fluxo guiado no molde CGU: capa, modalidade, campos mínimos e minuta pronta."
    >
      <div style={introCardStyle}>
        <div>
          <h2 className="admin-h2" style={{ marginTop: 0 }}>
            Fluxo guiado do modelo
          </h2>
          <p style={{ marginTop: 0, marginBottom: 0, opacity: 0.86 }}>
            O texto institucional já vem montado. Você só escolhe a modalidade
            e ajusta os campos mínimos que mudam de um caso para outro.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={summaryPillStyle}>Etapa {etapa}/4</span>
          <span style={summaryPillStyle}>
            Modalidade: {selectedKindLabel}
          </span>
          <span style={summaryPillStyle}>
            {editingId ? "Editando modelo" : "Novo modelo"}
          </span>
        </div>
      </div>

      <div style={stepPanelStyle}>
        <div style={stepHeaderStyle}>
          <div>
            <span style={stepLabelStyle}>1. Capa</span>
            <h3 style={{ margin: "8px 0 0" }}>Identificação do modelo</h3>
          </div>
          <p style={stepHintStyle}>
            Nomeie a peça e mantenha o padrão institucional do IPECC.
          </p>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={fieldWrapStyle}>
            <label>Nome do modelo</label>
            <input
              style={{ ...gdInputStyle, marginTop: 0, maxWidth: 640 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Contrato padrão de parceria"
            />
          </div>
          <p style={{ margin: 0, opacity: 0.76, fontSize: 13 }}>
            O formato técnico e o texto-base são definidos pelo tipo escolhido.
          </p>
        </div>
      </div>

      <div style={stepPanelStyle}>
        <div style={stepHeaderStyle}>
          <div>
            <span style={stepLabelStyle}>2. Modalidade</span>
            <h3 style={{ margin: "8px 0 0" }}>Escolha a peça jurídica</h3>
          </div>
          <p style={stepHintStyle}>
            Selecione uma modalidade para carregar o corpo institucional
            correspondente.
          </p>
        </div>

        <div style={kindCardGridStyle}>
          {kindOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => alterarKind(opt.value)}
              style={modelKindCardStyle(kind === opt.value)}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>
                {opt.label}
              </strong>
              <span style={{ fontSize: 12, opacity: 0.82 }}>{opt.help}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={stepPanelStyle}>
        <div style={stepHeaderStyle}>
          <div>
            <span style={stepLabelStyle}>3. Campos mínimos</span>
            <h3 style={{ margin: "8px 0 0" }}>Dados específicos da peça</h3>
          </div>
          <p style={stepHintStyle}>
            Preencha só as informações que mudam em cada documento.
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
                <div style={fieldWrapStyle}>
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
              </div>
            );
          })}
        </div>
      </div>

      <div style={stepPanelStyle}>
        <div style={stepHeaderStyle}>
          <div>
            <span style={stepLabelStyle}>4. Minuta e notas</span>
            <h3 style={{ margin: "8px 0 0" }}>Prévia gerada</h3>
          </div>
          <p style={stepHintStyle}>
            A minuta aparece pronta para leitura, revisão e posterior
            assinatura.
          </p>
        </div>

        <div style={paperPreviewStyle}>{generatedBody}</div>

        <div style={notesStyle}>
          <strong style={{ display: "block", marginBottom: 6 }}>
            Notas explicativas - leitura obrigatória
          </strong>
          <p style={{ marginTop: 0, marginBottom: 8 }}>
            O documento mantém a redação institucional e apenas adapta o que
            for específico do caso concreto, seguindo o espírito do formulário
            guiado da CGU.
          </p>
          <p style={{ margin: 0 }}>
            Depois de aprovado internamente, a minuta segue para assinatura e
            arquivo/publicação conforme o fluxo do módulo.
          </p>
        </div>

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
              onClick={() => setEtapa((p) => (p - 1) as 1 | 2 | 3 | 4)}
            >
              Voltar
            </button>
          ) : null}
          {etapa < 4 ? (
            <button
              type="button"
              style={gdBtnStyle}
              onClick={() => setEtapa((p) => (p + 1) as 1 | 2 | 3 | 4)}
            >
              Continuar
            </button>
          ) : null}
          {etapa === 4 ? (
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
                  {rotuloTipoModelo(t.kind)} Â· {t.format}
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
