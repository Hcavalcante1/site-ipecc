"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  GdDocumentTemplate,
  GdTemplateFormat,
  GdTemplateKind,
} from "@/lib/documentos/types";
import { GD_TEMPLATE_KINDS } from "@/lib/documentos/types";
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

type FixedBlock = {
  title: string;
  body: string;
};

function getFixedBlocks(kind: GdTemplateKind): FixedBlock[] {
  const base = [
    {
      title: "Base institucional",
      body:
        "Documento emitido pelo IPECC em padrão oficial, com linguagem institucional, redação objetiva e validação conforme legislação e normas aplicáveis.",
    },
    {
      title: "Regra geral",
      body:
        "O texto fixo já vem estruturado no sistema. O usuário altera apenas as especificidades do caso concreto.",
    },
  ];

  switch (kind) {
    case "oficio":
      return [
        ...base,
        {
          title: "Ofício",
          body:
            "Estrutura fixa com destinatário, assunto, referência e fecho institucional. Os campos variáveis se limitam à identificação, ao objeto e ao prazo.",
        },
        {
          title: "Fecho padrão",
          body:
            "A conclusão segue a fórmula formal institucional, com assinatura, data e identificação do responsável.",
        },
      ];
    case "declaracao":
      return [
        ...base,
        {
          title: "Declaração",
          body:
            "Texto declaratório padronizado, com fundamento institucional e redação formal. As variáveis ficam restritas ao declarante, à finalidade e à validade.",
        },
        {
          title: "Validade",
          body:
            "A validade e as observações complementares entram apenas quando necessário para o caso concreto.",
        },
      ];
    case "plano_trabalho":
      return [
        ...base,
        {
          title: "Plano de trabalho",
          body:
            "Estrutura fixa com identificação, objeto, metas, resultados esperados e justificativa. O usuário altera somente o conteúdo específico do projeto.",
        },
        {
          title: "Execução",
          body:
            "Cronograma, responsabilidades e observações seguem padrão institucional e aparecem já montados na prévia.",
        },
      ];
    case "prestacao_contas":
      return [
        ...base,
        {
          title: "Prestação de contas",
          body:
            "Texto fixo com período, objeto de referência, execução, conformidade e encerramento. O modelo mantém a linguagem formal e o encadeamento institucional.",
        },
        {
          title: "Encaminhamento",
          body:
            "As observações finais e ressalvas são preenchidas somente quando houver particularidades do processo.",
        },
      ];
    case "convenio":
    case "termo":
    case "contrato":
      return [
        ...base,
        {
          title: "Instrumento jurídico",
          body:
            "Partes, objeto, vigência, cláusulas e disposições finais seguem o molde institucional, com linguagem jurídica padronizada e aderente às normas aplicáveis.",
        },
        {
          title: "Cláusulas fixas",
          body:
            "As obrigações, referências normativas e condições de publicidade já aparecem estruturadas na peça.",
        },
      ];
    case "ata":
      return [
        ...base,
        {
          title: "Ata",
          body:
            "O texto fixo organiza data, participantes, pauta, deliberações e encerramento. O usuário apenas registra o conteúdo específico da reunião.",
        },
        {
          title: "Registro formal",
          body:
            "A ata já é montada com tom institucional e linguagem objetiva, própria de registro administrativo.",
        },
      ];
    case "relatorio":
      return [
        ...base,
        {
          title: "Relatório",
          body:
            "A estrutura fixa já prevê período, escopo, resultados, base técnica e conclusão, deixando o usuário alterar apenas os achados e dados do caso.",
        },
        {
          title: "Conclusão",
          body:
            "A redação final preserva padrão institucional e não exige texto livre extenso.",
        },
      ];
    default:
      return [
        ...base,
        {
          title: "Modelo genérico",
          body:
            "O sistema mantém o padrão institucional e entrega a peça pronta com os campos específicos mínimos.",
        },
      ];
  }
}

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
  const fixedBlocks = useMemo(() => getFixedBlocks(kind), [kind]);
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
            1. Identificação
          </button>
          <button
            type="button"
            style={wizardChipStyle(etapa === 2)}
            onClick={() => setEtapa(2)}
          >
            2. Campos específicos
          </button>
          <button
            type="button"
            style={wizardChipStyle(etapa === 3)}
            onClick={() => setEtapa(3)}
          >
            3. Prévia final
          </button>
        </div>

        {etapa === 1 ? (
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

            <p style={{ margin: 0, opacity: 0.72, fontSize: 13 }}>
              Formato institucional padrão: {format.toUpperCase()}.
            </p>
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
          <div style={sectionStyle}>
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid rgba(37,99,235,0.18)",
                background: "rgba(37,99,235,0.06)",
                display: "grid",
                gap: 10,
              }}
            >
              <strong>Parte fixa institucional visível</strong>
              <p style={{ margin: 0, opacity: 0.82 }}>
                Esta é a estrutura legal e administrativa já pronta, igual ao
                conceito de formulário guiado da CGU.
              </p>
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                {fixedBlocks.map((block) => (
                  <div
                    key={block.title}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: "#fff",
                      border: "1px solid rgba(148,163,184,0.35)",
                      color: "#0f172a",
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      {block.title}
                    </strong>
                    <p style={{ margin: 0, lineHeight: 1.55 }}>{block.body}</p>
                  </div>
                ))}
              </div>
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
            <strong>Prévia final</strong>
            <div style={previewStyle}>{generatedBody}</div>
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
