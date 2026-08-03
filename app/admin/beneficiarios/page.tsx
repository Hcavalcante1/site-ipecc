"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Beneficiario = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  programa: string | null;
  municipio: string | null;
  uf: string | null;
  data_entrada: string | null;
  observacoes: string | null;
  created_at: string;
};

const VAZIO: Omit<Beneficiario, "id" | "created_at"> = {
  nome: "",
  email: "",
  telefone: "",
  programa: "",
  municipio: "",
  uf: "",
  data_entrada: new Date().toISOString().slice(0, 10),
  observacoes: "",
};

export default function BeneficiariosPage() {
  const [lista, setLista] = useState<Beneficiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("beneficiarios")
      .select("*")
      .order("created_at", { ascending: false });
    setLista((data ?? []) as Beneficiario[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = lista.filter((b) => {
    const q = busca.toLowerCase();
    return (
      !q ||
      b.nome.toLowerCase().includes(q) ||
      (b.programa ?? "").toLowerCase().includes(q) ||
      (b.municipio ?? "").toLowerCase().includes(q)
    );
  });

  function abrirNovo() {
    setForm(VAZIO);
    setEditandoId(null);
    setMostrarForm(true);
    setMsg("");
  }

  function abrirEdicao(b: Beneficiario) {
    setForm({
      nome: b.nome,
      email: b.email ?? "",
      telefone: b.telefone ?? "",
      programa: b.programa ?? "",
      municipio: b.municipio ?? "",
      uf: b.uf ?? "",
      data_entrada: b.data_entrada ?? new Date().toISOString().slice(0, 10),
      observacoes: b.observacoes ?? "",
    });
    setEditandoId(b.id);
    setMostrarForm(true);
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setMsg("Nome é obrigatório.");
      return;
    }
    setSalvando(true);
    setMsg("Salvando...");

    const payload = {
      nome: form.nome.trim(),
      email: form.email?.trim() || null,
      telefone: form.telefone?.trim() || null,
      programa: form.programa?.trim() || null,
      municipio: form.municipio?.trim() || null,
      uf: form.uf?.trim().toUpperCase().slice(0, 2) || null,
      data_entrada: form.data_entrada || null,
      observacoes: form.observacoes?.trim() || null,
    };

    let error;
    if (editandoId) {
      ({ error } = await supabase.from("beneficiarios").update(payload).eq("id", editandoId));
    } else {
      ({ error } = await supabase.from("beneficiarios").insert(payload));
    }

    setSalvando(false);
    if (error) {
      setMsg(`Erro: ${error.message}`);
    } else {
      setMsg(editandoId ? "Atualizado com sucesso." : "Beneficiário cadastrado.");
      setMostrarForm(false);
      setEditandoId(null);
      setForm(VAZIO);
      void carregar();
    }
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("beneficiarios").delete().eq("id", id);
    if (error) {
      alert(`Erro ao excluir: ${error.message}`);
    } else {
      void carregar();
    }
  }

  function exportarCSV() {
    if (filtrados.length === 0) return;
    const cab = ["Nome", "E-mail", "Telefone", "Programa", "Município", "UF", "Data entrada", "Observações"];
    const linhas = filtrados.map((b) => [
      b.nome,
      b.email ?? "",
      b.telefone ?? "",
      b.programa ?? "",
      b.municipio ?? "",
      b.uf ?? "",
      b.data_entrada ?? "",
      b.observacoes ?? "",
    ]);
    const csv =
      "﻿" +
      [cab, ...linhas]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `beneficiarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.titulo}>Beneficiários</h1>
          <p style={s.sub}>
            Registro de pessoas atendidas pelos programas do IPECC. Total: <strong>{lista.length}</strong>
          </p>
        </div>
        <div style={s.headerAcoes}>
          <button style={s.btnSecundario} onClick={exportarCSV} disabled={filtrados.length === 0}>
            Exportar CSV ({filtrados.length})
          </button>
          <button style={s.btnPrimario} onClick={abrirNovo}>
            + Novo beneficiário
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div style={s.formCard}>
          <h2 style={s.formTitulo}>
            {editandoId ? "Editar beneficiário" : "Novo beneficiário"}
          </h2>

          <div style={s.formGrid}>
            <Campo label="Nome *" value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} />
            <Campo label="E-mail" value={form.email ?? ""} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            <Campo label="Telefone" value={form.telefone ?? ""} onChange={(v) => setForm((f) => ({ ...f, telefone: v }))} />
            <Campo label="Programa" value={form.programa ?? ""} onChange={(v) => setForm((f) => ({ ...f, programa: v }))} placeholder="Ex: Valer Mais, Oficinas..." />
            <Campo label="Município" value={form.municipio ?? ""} onChange={(v) => setForm((f) => ({ ...f, municipio: v }))} />
            <Campo label="UF" value={form.uf ?? ""} onChange={(v) => setForm((f) => ({ ...f, uf: v }))} placeholder="SP" />
            <Campo label="Data de entrada" type="date" value={form.data_entrada ?? ""} onChange={(v) => setForm((f) => ({ ...f, data_entrada: v }))} />
          </div>

          <label style={s.label}>
            Observações
            <textarea
              rows={3}
              value={form.observacoes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              style={s.textarea}
            />
          </label>

          <div style={s.formAcoes}>
            <button style={s.btnPrimario} onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : editandoId ? "Atualizar" : "Cadastrar"}
            </button>
            <button
              style={s.btnGhost}
              onClick={() => { setMostrarForm(false); setMsg(""); }}
            >
              Cancelar
            </button>
            {msg && <span style={s.msgFeedback}>{msg}</span>}
          </div>
        </div>
      )}

      <div style={s.buscaWrap}>
        <input
          type="search"
          placeholder="Buscar por nome, programa ou município..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={s.buscaInput}
        />
      </div>

      {loading ? (
        <p style={s.empty}>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p style={s.empty}>
          {busca ? "Nenhum resultado para a busca." : "Nenhum beneficiário cadastrado."}
        </p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Nome", "Programa", "Município/UF", "Entrada", "Contato", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((b, i) => (
                <tr key={b.id} style={i % 2 ? s.trAlt : s.tr}>
                  <td style={s.td}>
                    <strong>{b.nome}</strong>
                    {b.observacoes && (
                      <div style={s.obs}>{b.observacoes.slice(0, 60)}{b.observacoes.length > 60 ? "…" : ""}</div>
                    )}
                  </td>
                  <td style={s.td}>{b.programa || "—"}</td>
                  <td style={s.td}>
                    {b.municipio ? `${b.municipio}${b.uf ? ` / ${b.uf}` : ""}` : "—"}
                  </td>
                  <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                    {b.data_entrada
                      ? new Date(b.data_entrada + "T12:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td style={s.td}>
                    {b.email && <div style={s.contato}>{b.email}</div>}
                    {b.telefone && <div style={s.contato}>{b.telefone}</div>}
                    {!b.email && !b.telefone && "—"}
                  </td>
                  <td style={s.tdAcoes}>
                    <button style={s.btnEdit} onClick={() => abrirEdicao(b)}>Editar</button>
                    <button style={s.btnDel} onClick={() => excluir(b.id, b.nome)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={s.label}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={s.input}
      />
    </label>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, color: "#e5e7eb", maxWidth: 1100 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  titulo: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f1f5f9" },
  sub: { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  headerAcoes: { display: "flex", gap: 10, flexWrap: "wrap" },

  formCard: {
    background: "rgba(15,23,42,0.92)",
    border: "1px solid rgba(148,163,184,0.28)",
    borderRadius: 18,
    padding: 22,
    marginBottom: 20,
  },
  formTitulo: { margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#e0f2fe" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 },
  formAcoes: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 },
  msgFeedback: { fontSize: 13, color: "#86efac" },

  label: { fontSize: 13, fontWeight: 600, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 },
  input: { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },
  textarea: { marginTop: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.5)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13, resize: "vertical", width: "100%" },

  buscaWrap: { marginBottom: 14 },
  buscaInput: { width: "100%", maxWidth: 420, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.4)", background: "rgba(2,6,23,0.7)", color: "#e5e7eb", fontSize: 13 },

  tableWrap: { overflowX: "auto", borderRadius: 16, border: "1px solid rgba(148,163,184,0.18)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { background: "#1e293b", color: "#94a3b8", padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" },
  tr: { background: "#0f172a" },
  trAlt: { background: "#0a0f1e" },
  td: { padding: "11px 12px", borderTop: "1px solid rgba(148,163,184,0.10)", verticalAlign: "top", color: "#cbd5e1" },
  tdAcoes: { padding: "11px 12px", borderTop: "1px solid rgba(148,163,184,0.10)", whiteSpace: "nowrap" },
  obs: { fontSize: 11, color: "#64748b", marginTop: 2 },
  contato: { fontSize: 12, color: "#94a3b8" },

  btnPrimario: { padding: "9px 18px", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnSecundario: { padding: "9px 16px", borderRadius: 10, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  btnGhost: { padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnEdit: { marginRight: 6, padding: "5px 11px", borderRadius: 7, border: "1px solid #1e40af", background: "rgba(30,64,175,0.18)", color: "#93c5fd", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnDel: { padding: "5px 11px", borderRadius: 7, border: "1px solid #7f1d1d", background: "rgba(127,29,29,0.18)", color: "#fca5a5", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  empty: { color: "#64748b", marginTop: 24, textAlign: "center" },
};
