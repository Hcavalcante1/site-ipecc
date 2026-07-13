"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { triggerToast } from "@/components/AdminToast";

export type TipoDocumentoOption = {
  codigo: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** publicacao | emissao | prestacao | todos */
  para?: "publicacao" | "emissao" | "prestacao" | "todos";
  /**
   * codigo = grava slug (governança/GD)
   * label = grava texto legível (prestação CMS legado)
   */
  valueMode?: "codigo" | "label";
  allowCreate?: boolean;
  emptyOption?: string;
  /** opções extras (ex.: kinds GD formato ou listas legadas) */
  extraOptions?: TipoDocumentoOption[];
  disabled?: boolean;
  selectStyle?: React.CSSProperties;
  className?: string;
  id?: string;
  createDefaults?: {
    para_publicacao?: boolean;
    para_emissao?: boolean;
    para_prestacao?: boolean;
    criar_modelo?: boolean;
  };
};

/**
 * Select de tipo de documento alimentado pelo catálogo criável
 * (`/api/admin/documentos-tipos`) + botão para criar novo.
 */
export default function TipoDocumentoField({
  value,
  onChange,
  para = "publicacao",
  valueMode = "codigo",
  allowCreate = true,
  emptyOption,
  extraOptions = [],
  disabled,
  selectStyle,
  className,
  id,
  createDefaults,
}: Props) {
  const [tipos, setTipos] = useState<TipoDocumentoOption[]>([]);
  const [aviso, setAviso] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    const qs =
      para === "todos" ? "todos=0" : `para=${encodeURIComponent(para)}`;
    try {
      const res = await fetch(`/api/admin/documentos-tipos?${qs}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setAviso(json.error || "");
        setTipos([]);
        return;
      }
      setTipos(
        (json.tipos || []).map(
          (t: { codigo: string; label: string }) => ({
            codigo: t.codigo,
            label: t.label,
          })
        )
      );
      setAviso(json.aviso || "");
    } catch {
      setTipos([]);
    }
  }, [para]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const options = useMemo(() => {
    const map = new Map<string, TipoDocumentoOption>();
    for (const e of extraOptions) {
      if (!e.codigo) continue;
      map.set(e.codigo, e);
    }
    for (const t of tipos) {
      map.set(t.codigo, t);
    }
    return [...map.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR")
    );
  }, [tipos, extraOptions]);

  async function criar() {
    if (!novoNome.trim()) {
      triggerToast("Informe o nome do novo tipo.", "error");
      return;
    }
    setSaving(true);
    try {
      const defaults = {
        para_publicacao:
          createDefaults?.para_publicacao ??
          (para === "publicacao" || para === "todos"),
        para_emissao:
          createDefaults?.para_emissao ??
          (para === "emissao" || para === "todos"),
        para_prestacao:
          createDefaults?.para_prestacao ?? para === "prestacao",
        criar_modelo:
          createDefaults?.criar_modelo ??
          (para === "emissao" || para === "todos"),
      };
      const res = await fetch("/api/admin/documentos-tipos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: novoNome.trim(),
          ...defaults,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        triggerToast(json.error || "Falha ao criar tipo.", "error");
        return;
      }
      triggerToast("Tipo criado.", "success");
      setNovoNome("");
      const created = json.tipo as { codigo: string; label: string };
      onChange(valueMode === "label" ? created.label : created.codigo);
      await carregar();
    } catch {
      triggerToast("Erro inesperado ao criar tipo.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={className}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        style={selectStyle}
        onChange={(e) => onChange(e.target.value)}
      >
        {emptyOption !== undefined ? (
          <option value="">{emptyOption || "Selecione…"}</option>
        ) : null}
        {options.map((opt) => {
          const optValue = valueMode === "label" ? opt.label : opt.codigo;
          return (
            <option key={opt.codigo} value={optValue}>
              {opt.label}
            </option>
          );
        })}
      </select>

      {allowCreate ? (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Novo tipo (ex.: Declaração)"
            disabled={disabled || saving}
            style={{ minWidth: 200, flex: 1 }}
          />
          <button
            type="button"
            className="admin-button"
            disabled={disabled || saving}
            onClick={() => void criar()}
          >
            {saving ? "Criando…" : "Criar tipo"}
          </button>
          <Link href="/admin/editais/tipos" style={{ fontSize: 13 }}>
            Gerenciar tipos
          </Link>
        </div>
      ) : null}

      {aviso ? (
        <p style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>{aviso}</p>
      ) : null}
    </div>
  );
}
