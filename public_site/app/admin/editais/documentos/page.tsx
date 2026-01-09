"use client";
import dynamic from "next/dynamic";

export default dynamic(
  () => Promise.resolve(DocumentosPage),
  { ssr: false }
);

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";


type Documento = {
  id?: string;
  titulo: string;
  descricao: string;
  url: string;
  ordem: number;
  ativo: boolean;
};

const sWrap: React.CSSProperties = {
  padding: 24,
  maxWidth: 1100,
  margin: "0 auto",
};

const sHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 18,
};

const sTitle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
};

const sHint: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
  marginTop: 6,
};

const sBar: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const sBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
  cursor: "pointer",
  fontWeight: 600,
};

const sBtnPrimary: React.CSSProperties = {
  ...sBtn,
  background: "rgba(34,197,94,0.20)",
  border: "1px solid rgba(34,197,94,0.40)",
};

const sCard: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
  overflow: "hidden",
};

const sTable: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const sTh: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  letterSpacing: 0.3,
  opacity: 0.85,
  padding: "12px",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
};

const sTd: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  verticalAlign: "top",
};

const sInput: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
};

const sError: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.10)",
  marginBottom: 14,
};

const sOk: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid rgba(34,197,94,0.35)",
  background: "rgba(34,197,94,0.10)",
  marginBottom: 14,
};

export default function DocumentosAdminPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msgErro, setMsgErro] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState<string | null>(null);

  const tableName = useMemo(() => "editais_documentos", []);

  async function carregar() {
    setLoading(true);
    setMsgErro(null);

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("ordem", { ascending: true });

    if (error) {
      setMsgErro(error.message);
    } else {
      setDocumentos(
        (data ?? []).map((d) => ({
          id: d.id,
          titulo: d.titulo ?? "",
          descricao: d.descricao ?? "",
          url: d.url ?? "",
          ordem: Number(d.ordem ?? 0),
          ativo: d.ativo ?? true,
        }))
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function atualizar<K extends keyof Documento>(i: number, campo: K, valor: Documento[K]) {
    setDocumentos((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [campo]: valor };
      return next;
    });
  }

  async function salvar() {
    setSaving(true);
    setMsgErro(null);
    setMsgOk(null);

    const { error } = await supabase
      .from(tableName)
      .upsert(documentos, { onConflict: "id" });

    if (error) {
      setMsgErro(error.message);
    } else {
      setMsgOk("Salvo com sucesso.");
      carregar();
    }

    setSaving(false);
  }

  return (
    <div style={sWrap}>
      <div style={sHeader}>
        <div>
          <div style={sTitle}>Admin • Editais • Documentos</div>
          <div style={sHint}>
            Se não carregar no deploy, verifique as variáveis do Supabase no Vercel.
          </div>
        </div>

        <div style={sBar}>
          <button style={sBtn} onClick={carregar} disabled={loading}>
            Recarregar
          </button>
          <button style={sBtnPrimary} onClick={salvar} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {msgErro && <div style={sError}>{msgErro}</div>}
      {msgOk && <div style={sOk}>{msgOk}</div>}

      <div style={sCard}>
        <table style={sTable}>
          <thead>
            <tr>
              <th style={sTh}>Ordem</th>
              <th style={sTh}>Título</th>
              <th style={sTh}>Descrição</th>
              <th style={sTh}>URL</th>
              <th style={sTh}>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((d, i) => (
              <tr key={d.id ?? i}>
                <td style={sTd}>
                  <input
                    type="number"
                    style={sInput}
                    value={d.ordem}
                    onChange={(e) => atualizar(i, "ordem", Number(e.target.value))}
                  />
                </td>
                <td style={sTd}>
                  <input
                    style={sInput}
                    value={d.titulo}
                    onChange={(e) => atualizar(i, "titulo", e.target.value)}
                  />
                </td>
                <td style={sTd}>
                  <input
                    style={sInput}
                    value={d.descricao}
                    onChange={(e) => atualizar(i, "descricao", e.target.value)}
                  />
                </td>
                <td style={sTd}>
                  <input
                    style={sInput}
                    value={d.url}
                    onChange={(e) => atualizar(i, "url", e.target.value)}
                  />
                </td>
                <td style={sTd}>
                  <input
                    type="checkbox"
                    checked={d.ativo}
                    onChange={(e) => atualizar(i, "ativo", e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
