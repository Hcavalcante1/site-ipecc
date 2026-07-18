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
  getGdTemplateFixedIntro,
  getGdTemplateStructureChips,
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
  gap: 14,
};

const wizardStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  marginBottom: 14,
  padding: 14,
  borderRadius: 20,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.24), rgba(15,23,42,0.1))",
};

const wizardChipStyle = (active: boolean) => ({
  padding: "12px 18px",
  borderRadius: 999,
  border: `1px solid ${active ? "#60a5fa" : "#334155"}`,
  background: active
    ? "linear-gradient(180deg, rgba(37,99,235,0.30), rgba(37,99,235,0.14))"
    : "rgba(255,255,255,0.04)",
  color: active ? "#eff6ff" : "#cbd5e1",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  minWidth: 130,
  textAlign: "center" as const,
  boxShadow: active ? "0 8px 18px rgba(37,99,235,0.20)" : "none",
  transition: "transform 0.15s ease, background 0.15s ease, border-color 0.15s ease",
});

const stepCardStyle = (active: boolean) => ({
  padding: 14,
  borderRadius: 14,
  border: `1px solid ${active ? "rgba(37,99,235,0.45)" : "rgba(148,163,184,0.25)"}`,
  background: active ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.03)",
  boxShadow: active ? "0 8px 22px rgba(37,99,235,0.10)" : "none",
});

const kindTabsStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
  padding: 10,
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(15,23,42,0.24)",
};

const kindTabStyle = (active: boolean) => ({
  padding: "10px 14px",
  borderRadius: 999,
  border: `1px solid ${active ? "#60a5fa" : "#334155"}`,
  background: active
    ? "linear-gradient(180deg, rgba(37,99,235,0.34), rgba(37,99,235,0.16))"
    : "rgba(255,255,255,0.04)",
  color: active ? "#eff6ff" : "#cbd5e1",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  minWidth: 120,
  flex: "1 1 120px" as const,
  textAlign: "center" as const,
  boxShadow: active ? "0 8px 18px rgba(37,99,235,0.22)" : "none",
  transition: "transform 0.15s ease, background 0.15s ease, border-color 0.15s ease",
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

const chipRailStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
};

const chipStyle = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(96,165,250,0.35)",
  background: "rgba(37,99,235,0.10)",
  color: "#dbeafe",
  fontSize: 12,
  fontWeight: 700,
};

const fixedTextStyle = {
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(255,255,255,0.03)",
  color: "#e5e7eb",
  lineHeight: 1.55,
  fontSize: 13,
};

const fieldWrapStyle = {
  display: "grid",
  gap: 6,
};

const kindOptions: Array<{ value: GdTemplateKind; label: string; help: string }> = [
  {
    value: "oficio",
    label: "Oficio",
    help: "Comunicaçao formal com destinatario, assunto e fecho.",
  },
  {
    value: "declaracao",
    label: "Declaracao",
    help: "Texto declaratorio com finalidade e validade.",
  },
  {
    value: "contrato",
    label: "Contrato",
    help: "Instrumento juridico com partes, objeto e vigencia.",
  },
  {
    value: "convenio",
    label: "Convenio",
    help: "Instrumento de cooperacao institucional.",
  },
  {
    value: "termo",
    label: "Termo",
    help: "Termo institucional ou de ajuste.",
  },
  {
    value: "ata",
    label: "Ata",
    help: "Registro formal de reuniao ou deliberacao.",
  },
  {
    value: "relatorio",
    label: "Relatorio",
    help: "Resumo tecnico com achados e conclusao.",
  },
  {
    value: "plano_trabalho",
    label: "Plano de trabalho",
    help: "Objetivos, metas, prazo e resultados esperados.",
  },
  {
    value: "prestacao_contas",
    label: "Prestacao de contas",
    help: "Execucao, conformidade e encerramento.",
  },
  {
    value: "outro",
    label: "Outro",
    help: "Modelo generico institucional.",
  },
];

const ETAPAS = [
  { id: 1 as const, titulo: "Capa" },
  { id: 2 as const, titulo: "Tipo" },
  { id: 3 as const, titulo: "Dados" },
  { id: 4 as const, titulo: "Minuta" },
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
  const kindLabel = useMemo(
    () => kindOptions.find((opt) => opt.value === kind)?.label ?? rotuloTipoModelo(kind),
    [kind]
  );
  const kindHelp = useMemo(
    () => kindOptions.find((opt) => opt.value === kind)?.help ?? "",
    [kind]
  );
  const kindChips = useMemo(() => getGdTemplateStructureChips(kind), [kind]);
  const kindIntro = useMemo(() => getGdTemplateFixedIntro(kind), [kind]);
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
  }

  function voltarEtapa() {
    setEtapa((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : 1));
  }

  function seguirEtapa() {
    setEtapa((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : 4));
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
    const res = await fetch(`/api/admin/documentos/modelos?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao remover modelo.");
      return;
    }
    if (editingId === id) {
      limparForm();
    }
    carregar();
  }

  function renderEtapa() {
    if (etapa === 1) {
      return (
        <div style={stepCardStyle(true)}>
          <strong style={{ display: "block", marginBottom: 6 }}>Capa do modelo</strong>
          <p style={{ marginTop: 0, opacity: 0.85 }}>
            Informe o nome do modelo e siga para a escolha guiada do tipo.
          </p>

          <div style={sectionStyle}>
            <div style={fieldWrapStyle}>
              <label>Nome do modelo</label>
              <input
                style={{ ...gdInputStyle, marginTop: 0, maxWidth: 640 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Contrato padrao de parceria"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" style={gdBtnStyle} onClick={seguirEtapa}>
              Continuar
            </button>
          </div>
        </div>
      );
    }

    if (etapa === 2) {
      return (
        <div style={stepCardStyle(true)}>
          <strong style={{ display: "block", marginBottom: 6 }}>Tipo do modelo</strong>
          <p style={{ marginTop: 0, opacity: 0.85 }}>
            A escolha do tipo tambem e guiada. Selecione a modalidade para carregar a estrutura certa.
          </p>

          <div style={kindTabsStyle} role="tablist" aria-label="Tipos de modelo">
            {kindOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={kind === opt.value}
                style={kindTabStyle(kind === opt.value)}
                onClick={() => alterarKind(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(255,255,255,0.03)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <strong>{kindLabel}</strong>
              <p style={{ margin: 0, opacity: 0.82 }}>{kindHelp}</p>
            </div>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(37,99,235,0.16)",
                color: "#bfdbfe",
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Tipo selecionado
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" style={gdBtnStyle} onClick={voltarEtapa}>
              Voltar
            </button>
            <button type="button" style={gdBtnStyle} onClick={seguirEtapa}>
              Continuar
            </button>
          </div>
        </div>
      );
    }

    if (etapa === 3) {
      return (
        <div style={stepCardStyle(true)}>
          <strong style={{ display: "block", marginBottom: 6 }}>Dados especificos</strong>
          <p style={{ marginTop: 0, opacity: 0.85 }}>
            Preencha apenas o que muda de um documento para outro. Os textos
            fixos seguem nos chips e no bloco institucional embutido.
          </p>

          <div style={chipRailStyle} aria-label="Chips do documento">
            {kindChips.map((chip) => (
              <span key={chip.label} style={chipStyle} title={chip.help}>
                {chip.label}
              </span>
            ))}
          </div>

          <div style={fixedTextStyle}>
            <strong style={{ display: "block", marginBottom: 6 }}>
              Texto-base institucional
            </strong>
            <span>{kindIntro}</span>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
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
                  {field.help ? <small style={{ opacity: 0.72 }}>{field.help}</small> : null}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" style={gdBtnStyle} onClick={voltarEtapa}>
              Voltar
            </button>
            <button type="button" style={gdBtnStyle} onClick={seguirEtapa}>
              Continuar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={stepCardStyle(true)}>
        <strong style={{ display: "block", marginBottom: 6 }}>Minuta final</strong>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          A minuta aparece pronta para revisão e assinatura. Ela é o resultado;
          os blocos fixos já estão montados acima.
        </p>

        <div style={previewStyle}>{generatedBody}</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <button type="button" style={gdBtnStyle} onClick={voltarEtapa}>
            Voltar
          </button>
          <button type="button" style={gdBtnStyle} onClick={salvar}>
            {editingId ? "Salvar alteracoes" : "Criar modelo"}
          </button>
          {editingId ? (
            <button type="button" style={gdDangerBtnStyle} onClick={limparForm}>
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
      description="Fluxo guiado em etapas: capa, tipo, dados e minuta final."
    >
      <div style={introCardStyle}>
        <div>
          <h2 className="admin-h2" style={{ marginTop: 0 }}>
            Fluxo guiado do modelo
          </h2>
          <p style={{ marginTop: 0, marginBottom: 0, opacity: 0.86 }}>
            O modelo ja carrega a estrutura institucional. Voce percorre as etapas e altera apenas o necessario.
          </p>
        </div>

        <div style={wizardStyle} aria-label="Etapas do formulario">
          {ETAPAS.map((item) => (
            <button
              key={item.id}
              type="button"
              style={wizardChipStyle(etapa === item.id)}
              onClick={() => setEtapa(item.id)}
            >
              {item.id}. {item.titulo}
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
