"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Edital = {
  id?: string;
  edital_id?: string | null;
  status_fase?: string | null;
  resultado_preliminar_titulo?: string | null;
  resultado_preliminar_url?: string | null;
  prazo_recurso_inicio?: string | null;
  prazo_recurso_fim?: string | null;
  resultado_final_titulo?: string | null;
  resultado_final_url?: string | null;
  homologacao_titulo?: string | null;
  homologacao_url?: string | null;
  contrato_titulo?: string | null;
  contrato_url?: string | null;
  observacoes?: string | null;
  publicado?: boolean | null;
};

function novoEdital(): Edital {
  return {
    edital_id: "",
    status_fase: "",
    resultado_preliminar_titulo: "",
    resultado_preliminar_url: "",
    prazo_recurso_inicio: "",
    prazo_recurso_fim: "",
    resultado_final_titulo: "",
    resultado_final_url: "",
    homologacao_titulo: "",
    homologacao_url: "",
    contrato_titulo: "",
    contrato_url: "",
    observacoes: "",
    publicado: true,
  };
}

const STATUS_FASE_OPTIONS = ["", "Seleção", "Recursos", "Homologação", "Contratação", "Encerrado"];

const styles = {
  page: {
    display: "grid",
    gap: 24,
  } as React.CSSProperties,

  sectionCard: {
    background: "linear-gradient(135deg, rgba(9,18,40,0.96), rgba(6,23,63,0.92))",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 14px 34px rgba(0,0,0,0.30)",
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: "2rem",
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#f8fafc",
  } as React.CSSProperties,

  toolbar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
    marginBottom: 6,
  } as React.CSSProperties,

  greenBtn: {
    background: "#22c55e",
    color: "#052814",
    padding: "10px 18px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.2,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(34,197,94,0.18)",
  } as React.CSSProperties,

  redBtn: {
    background: "#ef4444",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.2,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(239,68,68,0.22)",
  } as React.CSSProperties,

  recordCard: {
    marginTop: 14,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 18,
  } as React.CSSProperties,

  recordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  } as React.CSSProperties,

  recordTitle: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: 800,
    color: "#f8fafc",
  } as React.CSSProperties,

  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.14)",
    color: "#86efac",
    border: "1px solid rgba(34,197,94,0.28)",
    fontSize: "0.84rem",
    fontWeight: 700,
  } as React.CSSProperties,

  badgeMuted: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: "0.84rem",
    fontWeight: 700,
  } as React.CSSProperties,

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  } as React.CSSProperties,

  full: {
    gridColumn: "1 / -1",
  } as React.CSSProperties,

  fieldWrap: {
    display: "grid",
    gap: 6,
  } as React.CSSProperties,

  label: {
    fontSize: "0.93rem",
    fontWeight: 700,
    color: "#e2e8f0",
  } as React.CSSProperties,

  input: {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "10px 12px",
    outline: "none",
    fontSize: "0.95rem",
  } as React.CSSProperties,

  select: {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid rgba(34,197,94,0.38)",
    background: "#0b1220",
    color: "#f8fafc",
    padding: "10px 12px",
    outline: "none",
    fontSize: "0.95rem",
    cursor: "pointer",
    appearance: "auto",
    boxShadow: "0 0 0 1px rgba(34,197,94,0.10) inset",
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "10px 12px",
    outline: "none",
    fontSize: "0.95rem",
    resize: "vertical",
    minHeight: 96,
  } as React.CSSProperties,

  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,

  switchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#e5e7eb",
    fontWeight: 700,
  } as React.CSSProperties,

  msg: {
    marginTop: 10,
    color: "#cbd5e1",
    fontWeight: 700,
    fontSize: "0.95rem",
  } as React.CSSProperties,

  blockMsg: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    fontWeight: 700,
    fontSize: "0.92rem",
  } as React.CSSProperties,
};

function emptyToNull(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export default function TransparenciaEditaisAdmin() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [blockMsgs, setBlockMsgs] = useState<Record<number, string>>({});
  const [editais, setEditais] = useState<Edital[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase.from("transparencia_editais").select("*");

    if (error) {
      console.error("Erro ao carregar editais:", error);
      setMsg(`Erro ao carregar editais: ${error.message}`);
      setEditais([novoEdital()]);
      setLoading(false);
      return;
    }

    setEditais(data && data.length > 0 ? data : [novoEdital()]);
    setLoading(false);
  }

  function setBlockMsg(index: number, message: string) {
    setBlockMsgs((prev) => ({ ...prev, [index]: message }));
  }

  function atualizarCampo<K extends keyof Edital>(index: number, campo: K, valor: Edital[K]) {
    setEditais((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  }

  function adicionarBloco() {
    setEditais((prev) => [...prev, novoEdital()]);
    setMsg("Novo bloco de edital adicionado.");
  }

  async function salvarTodos() {
    setMsg("Salvando editais...");

    for (let i = 0; i < editais.length; i++) {
      const item = editais[i];
      const editalTexto = emptyToNull(item.edital_id);

      if (!editalTexto) {
        setMsg(`Erro no edital ${i + 1}: o campo \"Edital / Chamamento\" é obrigatório.`);
        setBlockMsg(i, 'Erro neste bloco: o campo "Edital / Chamamento" é obrigatório.');
        return;
      }

      if (!item.status_fase || item.status_fase.trim() === "") {
        setMsg(`Erro no edital ${i + 1}: o campo \"Status da fase\" é obrigatório.`);
        setBlockMsg(i, 'Erro neste bloco: o campo "Status da fase" é obrigatório.');
        return;
      }

      const payload = {
        edital_id: editalTexto,
        status_fase: item.status_fase.trim(),
        resultado_preliminar_titulo: emptyToNull(item.resultado_preliminar_titulo),
        resultado_preliminar_url: emptyToNull(item.resultado_preliminar_url),
        prazo_recurso_inicio: emptyToNull(item.prazo_recurso_inicio),
        prazo_recurso_fim: emptyToNull(item.prazo_recurso_fim),
        resultado_final_titulo: emptyToNull(item.resultado_final_titulo),
        resultado_final_url: emptyToNull(item.resultado_final_url),
        homologacao_titulo: emptyToNull(item.homologacao_titulo),
        homologacao_url: emptyToNull(item.homologacao_url),
        contrato_titulo: emptyToNull(item.contrato_titulo),
        contrato_url: emptyToNull(item.contrato_url),
        observacoes: emptyToNull(item.observacoes),
        publicado: item.publicado ?? true,
      };

      const response = item.id
        ? await supabase.from("transparencia_editais").update(payload).eq("id", item.id)
        : await supabase.from("transparencia_editais").insert(payload);

      if (response.error) {
        console.error("Erro real ao salvar edital:", response.error);
        setMsg(`Erro ao salvar editais: ${response.error.message}`);
        setBlockMsg(i, `Erro ao salvar este bloco: ${response.error.message}`);
        return;
      }

      setBlockMsg(i, "Bloco salvo com sucesso.");
    }

    await carregar();
    setMsg("Editais salvos com sucesso.");
  }

  async function salvarBloco(index: number) {
    const item = editais[index];
    const editalTexto = emptyToNull(item.edital_id);

    if (!editalTexto) {
      setBlockMsg(index, 'Erro neste bloco: o campo "Edital / Chamamento" é obrigatório.');
      return;
    }

    if (!item.status_fase || item.status_fase.trim() === "") {
      setBlockMsg(index, 'Erro neste bloco: o campo "Status da fase" é obrigatório.');
      return;
    }

    setBlockMsg(index, "Salvando este bloco...");

    const payload = {
      edital_id: editalTexto,
      status_fase: item.status_fase.trim(),
      resultado_preliminar_titulo: emptyToNull(item.resultado_preliminar_titulo),
      resultado_preliminar_url: emptyToNull(item.resultado_preliminar_url),
      prazo_recurso_inicio: emptyToNull(item.prazo_recurso_inicio),
      prazo_recurso_fim: emptyToNull(item.prazo_recurso_fim),
      resultado_final_titulo: emptyToNull(item.resultado_final_titulo),
      resultado_final_url: emptyToNull(item.resultado_final_url),
      homologacao_titulo: emptyToNull(item.homologacao_titulo),
      homologacao_url: emptyToNull(item.homologacao_url),
      contrato_titulo: emptyToNull(item.contrato_titulo),
      contrato_url: emptyToNull(item.contrato_url),
      observacoes: emptyToNull(item.observacoes),
      publicado: item.publicado ?? true,
    };

    const response = item.id
      ? await supabase.from("transparencia_editais").update(payload).eq("id", item.id)
      : await supabase.from("transparencia_editais").insert(payload);

    if (response.error) {
      console.error(response.error);
      setBlockMsg(index, `Erro ao salvar este bloco: ${response.error.message}`);
      setMsg(`Erro ao salvar editais: ${response.error.message}`);
      return;
    }

    await carregar();
    setBlockMsg(index, "Bloco salvo com sucesso.");
    setMsg("Edital salvo com sucesso.");
  }

  async function excluirBloco(id?: string, index?: number) {
    const idx = index ?? 0;
    const confirmado = window.confirm("Tem certeza que deseja excluir este edital? Esta ação não pode ser desfeita.");

    if (!confirmado) {
      setBlockMsg(idx, "Exclusão cancelada.");
      setMsg("Exclusão cancelada.");
      return;
    }

    if (!id) {
      setEditais((prev) => prev.filter((_, i) => i !== idx));
      setBlockMsg(idx, "Bloco removido da tela.");
      setMsg("Bloco removido da tela.");
      return;
    }

    const { error } = await supabase.from("transparencia_editais").delete().eq("id", id);

    if (error) {
      console.error(error);
      setBlockMsg(idx, `Erro ao excluir este bloco: ${error.message}`);
      setMsg(`Erro ao excluir edital: ${error.message}`);
      return;
    }

    await carregar();
    setMsg("Edital excluído com sucesso.");
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <section style={styles.sectionCard}>
          <h1 style={styles.title}>Tabela de Editais e Chamamentos</h1>
          <p style={styles.msg}>Carregando...</p>
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <section style={styles.sectionCard}>
        <h1 style={styles.title}>Tabela de Editais e Chamamentos</h1>

        <div style={styles.toolbar}>
          <button type="button" style={styles.greenBtn} onClick={adicionarBloco}>
            + Adicionar edital
          </button>
          <button type="button" style={styles.greenBtn} onClick={salvarTodos}>
            Salvar todos
          </button>
        </div>

        {msg ? <div style={styles.msg}>{msg}</div> : null}

        {editais.map((item, index) => (
          <article key={item.id ?? `novo-${index}`} style={styles.recordCard}>
            <div style={styles.recordHeader}>
              <h2 style={styles.recordTitle}>Edital {index + 1}</h2>
              <span style={item.publicado ? styles.badge : styles.badgeMuted}>
                {item.publicado ? "Publicado" : "Oculto"}
              </span>
            </div>

            <div style={styles.grid2}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Edital / Chamamento</label>
                <input style={styles.input} value={item.edital_id ?? ""} onChange={(e) => atualizarCampo(index, "edital_id", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Status da fase</label>
                <select style={styles.select} value={item.status_fase ?? ""} onChange={(e) => atualizarCampo(index, "status_fase", e.target.value)}>
                  {STATUS_FASE_OPTIONS.map((opcao) => (
                    <option key={opcao || "vazio"} value={opcao}>
                      {opcao || "Selecione"}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Resultado preliminar - título</label>
                <input style={styles.input} value={item.resultado_preliminar_titulo ?? ""} onChange={(e) => atualizarCampo(index, "resultado_preliminar_titulo", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Resultado preliminar - URL</label>
                <input style={styles.input} value={item.resultado_preliminar_url ?? ""} onChange={(e) => atualizarCampo(index, "resultado_preliminar_url", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Prazo recurso - início</label>
                <input type="date" style={styles.input} value={item.prazo_recurso_inicio ?? ""} onChange={(e) => atualizarCampo(index, "prazo_recurso_inicio", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Prazo recurso - fim</label>
                <input type="date" style={styles.input} value={item.prazo_recurso_fim ?? ""} onChange={(e) => atualizarCampo(index, "prazo_recurso_fim", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Resultado final - título</label>
                <input style={styles.input} value={item.resultado_final_titulo ?? ""} onChange={(e) => atualizarCampo(index, "resultado_final_titulo", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Resultado final - URL</label>
                <input style={styles.input} value={item.resultado_final_url ?? ""} onChange={(e) => atualizarCampo(index, "resultado_final_url", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Homologação - título</label>
                <input style={styles.input} value={item.homologacao_titulo ?? ""} onChange={(e) => atualizarCampo(index, "homologacao_titulo", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Homologação - URL</label>
                <input style={styles.input} value={item.homologacao_url ?? ""} onChange={(e) => atualizarCampo(index, "homologacao_url", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Contrato - título</label>
                <input style={styles.input} value={item.contrato_titulo ?? ""} onChange={(e) => atualizarCampo(index, "contrato_titulo", e.target.value)} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Contrato - URL</label>
                <input style={styles.input} value={item.contrato_url ?? ""} onChange={(e) => atualizarCampo(index, "contrato_url", e.target.value)} />
              </div>

              <div style={{ ...styles.fieldWrap, ...styles.full }}>
                <label style={styles.label}>Observações</label>
                <textarea style={styles.textarea} value={item.observacoes ?? ""} onChange={(e) => atualizarCampo(index, "observacoes", e.target.value)} />
              </div>
            </div>

            <div style={styles.footer}>
              <label style={styles.switchRow}>
                <input type="checkbox" checked={item.publicado ?? true} onChange={(e) => atualizarCampo(index, "publicado", e.target.checked)} />
                Publicado
              </label>

              <div style={styles.toolbar}>
                <button type="button" style={styles.greenBtn} onClick={() => salvarBloco(index)}>
                  Salvar bloco
                </button>
                <button type="button" style={styles.redBtn} onClick={() => excluirBloco(item.id, index)}>
                  Excluir bloco
                </button>
              </div>
            </div>

            {blockMsgs[index] ? <div style={styles.blockMsg}>{blockMsgs[index]}</div> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
