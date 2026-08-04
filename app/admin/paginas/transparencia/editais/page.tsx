"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AdminButton, AdminLoadingButton, AdminInput, AdminTextarea, AdminSelect, AdminFileInput, AdminSectionHeader, spacing, borderRadius, shadows, sizes, typography } from "@/components/admin";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { registroNoEscopoProcesso } from "@/lib/auth/adminEscopo";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

type Edital = {
  id?: string;
  edital_id?: string | null;
  processo_id?: string | null;
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

function novoEdital(processoId?: string | null): Edital {
  return {
    edital_id: "",
    processo_id: processoId || null,
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
    publicado: false,
  };
}

const STATUS_FASE_OPTIONS = ["", "Seleção", "Recursos", "Homologação", "Contratação", "Encerrado"];

const styles = {
  page: {
    display: "grid",
    gap: spacing.xxxl,
  } as React.CSSProperties,

  sectionCard: {
    background: "linear-gradient(135deg, rgba(9,18,40,0.96), rgba(6,23,63,0.92))",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    boxShadow: shadows.card,
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
    gap: spacing.md,
    flexWrap: "wrap",
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  } as React.CSSProperties,

  greenBtn: {
    background: "#22c55e",
    color: "#052814",
    padding: sizes.button.medium.padding,
    borderRadius: borderRadius.full,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: sizes.button.medium.fontSize,
    lineHeight: typography.lineHeight.normal,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadows.buttonGreen,
  } as React.CSSProperties,

  redBtn: {
    background: "#ef4444",
    color: "#fff",
    padding: sizes.button.medium.padding,
    borderRadius: borderRadius.full,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: sizes.button.medium.fontSize,
    lineHeight: typography.lineHeight.normal,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadows.buttonRed,
  } as React.CSSProperties,

  recordCard: {
    marginTop: spacing.lg,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: borderRadius.md,
    padding: spacing.xl,
  } as React.CSSProperties,

  recordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.base,
    marginBottom: spacing.lg,
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
    padding: `${spacing.xs}px ${spacing.md}px`,
    borderRadius: borderRadius.full,
    background: "rgba(34,197,94,0.14)",
    color: "#86efac",
    border: "1px solid rgba(34,197,94,0.28)",
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  } as React.CSSProperties,

  badgeMuted: {
    display: "inline-flex",
    alignItems: "center",
    padding: `${spacing.xs}px ${spacing.md}px`,
    borderRadius: borderRadius.full,
    background: "rgba(255,255,255,0.06)",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  } as React.CSSProperties,

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: sizes.grid.gap,
  } as React.CSSProperties,

  full: {
    gridColumn: "1 / -1",
  } as React.CSSProperties,

  fieldWrap: {
    display: "grid",
    gap: spacing.xs,
  } as React.CSSProperties,

  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: "#e2e8f0",
  } as React.CSSProperties,

  input: {
    width: "100%",
    minHeight: sizes.input.height,
    borderRadius: borderRadius.sm,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: sizes.input.padding,
    outline: "none",
    fontSize: sizes.input.fontSize,
  } as React.CSSProperties,

  select: {
    width: "100%",
    minHeight: sizes.input.height,
    borderRadius: borderRadius.sm,
    border: "1px solid rgba(34,197,94,0.38)",
    background: "#0b1220",
    color: "#f8fafc",
    padding: sizes.input.padding,
    outline: "none",
    fontSize: sizes.input.fontSize,
    cursor: "pointer",
    appearance: "auto",
    boxShadow: shadows.inset,
  } as React.CSSProperties,

  textarea: {
    width: "100%",
    borderRadius: borderRadius.sm,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: sizes.textarea.padding,
    outline: "none",
    fontSize: sizes.textarea.fontSize,
    resize: "vertical",
    minHeight: sizes.textarea.minHeight,
  } as React.CSSProperties,

  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
    marginTop: spacing.lg,
    paddingTop: spacing.base,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,

  switchRow: {
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    color: "#e5e7eb",
    fontWeight: typography.fontWeight.bold,
  } as React.CSSProperties,

  msg: {
    marginTop: spacing.md,
    color: "#cbd5e1",
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
  } as React.CSSProperties,

  blockMsg: {
    marginTop: spacing.base,
    padding: `${spacing.md}px ${spacing.base}px`,
    borderRadius: borderRadius.sm,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  } as React.CSSProperties,
};

function emptyToNull(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export default function TransparenciaEditaisAdmin() {
  const escopo = useAdminEscopoCliente();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [blockMsgs, setBlockMsgs] = useState<Record<number, string>>({});
  const [editais, setEditais] = useState<Edital[]>([]);

  const processoPadrao =
    escopo.processoIds === "todos"
      ? null
      : escopo.processoIds[0] || null;

  useEffect(() => {
    if (escopo.loading) return;
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo.loading, escopo.processoIds]);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase.from("transparencia_editais").select("*");

    if (error) {
      console.error("Erro ao carregar editais:", error);
      setMsg(`Erro ao carregar editais: ${error.message}`);
      setEditais([novoEdital(processoPadrao)]);
      setLoading(false);
      return;
    }

    const filtrados = ((data || []) as Edital[]).filter((item) =>
      registroNoEscopoProcesso(item.processo_id, escopo.processoIds)
    );
    setEditais(filtrados.length > 0 ? filtrados : [novoEdital(processoPadrao)]);
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

// 🔥 COLE AQUI
async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, index: number, campo: keyof Edital) {
  const file = e.target.files?.[0];
  if (!file) return;

  const fileName = `${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("docs")
    .upload(`transparencia/parcerias/${fileName}`, file);

  if (error) {
    setBlockMsg(index, `Erro no envio: ${error.message}`);
    return;
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/docs/transparencia/parcerias/${fileName}`;

  atualizarCampo(index, campo, url);
  setBlockMsg(index, "Arquivo enviado. Clique em salvar bloco.");
}
  function adicionarBloco() {
    setEditais((prev) => [...prev, novoEdital(processoPadrao)]);
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
        processo_id: item.processo_id || processoPadrao,
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
        publicado: item.publicado ?? false,
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
      processo_id: item.processo_id || processoPadrao,
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
      publicado: item.publicado ?? false,
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

  const confirmado = await confirmAction("Tem certeza que deseja excluir este edital? Esta ação não pode ser desfeita.");
  if (!confirmado) {
    const rejeicao = isConfirmModalReady() || !window.confirm("Tem certeza que deseja excluir este edital? Esta ação não pode ser desfeita.");
    if (rejeicao) {
      setBlockMsg(idx, "Exclusão cancelada.");
      setMsg("Exclusão cancelada.");
      return;
    }
  }

  if (!id) {
    setEditais((prev) => {
      const nova = prev.filter((_, i) => i !== idx);
      return nova.length > 0 ? nova : [novoEdital(processoPadrao)];
    });

    setBlockMsg(idx, "Bloco removido da tela.");
    setMsg("Bloco removido da tela.");
    return;
  }

  const { error } = await supabase
    .from("transparencia_editais")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    setBlockMsg(idx, `Erro ao excluir este bloco: ${error.message}`);
    setMsg(`Erro ao excluir edital: ${error.message}`);
    return;
  }

  // 🔥 remove direto da tela sem recarregar
  setEditais((prev) => {
    const nova = prev.filter((_, i) => i !== idx);
    return nova.length > 0 ? nova : [novoEdital(processoPadrao)];
  });

  setBlockMsg(idx, "Bloco excluído com sucesso.");
  setMsg("Edital excluído com sucesso.");
}

if (loading) {
  return (
    <div style={styles.page}>
      <section style={styles.sectionCard}>
        <AdminSectionHeader level={1} style={styles.title}>Tabela de Editais e Chamamentos</AdminSectionHeader>
        <p style={styles.msg}>Carregando...</p>
      </section>
    </div>
  );
}

return (
  <div style={styles.page}>
    <section style={styles.sectionCard}>
      <AdminSectionHeader level={1} style={styles.title}>Tabela de Editais e Chamamentos</AdminSectionHeader>
      <p style={styles.msg}>
        Use esta area para registrar manualmente a continuidade do edital ja publicado:
        selecao, recursos, resultados, homologacao e contrato. A analise continua
        sendo humana e deve seguir os criterios de cada edital.
      </p>

      <div style={styles.toolbar}>
        <AdminButton type="button" variant="primary" style={styles.greenBtn} onClick={adicionarBloco}>
          + Adicionar edital
        </AdminButton>
        <AdminButton type="button" variant="primary" style={styles.greenBtn} onClick={salvarTodos}>
          Salvar todos
        </AdminButton>
      </div>

      {msg ? <div style={styles.msg}>{msg}</div> : null}

      {editais.map((item, index) => (
        <article key={item.id ?? `novo-${index}`} style={styles.recordCard}>
          <div style={styles.recordHeader}>
            <AdminSectionHeader level={2} style={styles.recordTitle}>Edital {index + 1}</AdminSectionHeader>
            <span style={item.publicado ? styles.badge : styles.badgeMuted}>
              {item.publicado ? "Publicado" : "Oculto"}
            </span>
          </div>

          <div style={styles.grid2}>
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Referencia do edital publicado</label>
              <AdminInput
                style={styles.input}
                value={item.edital_id ?? ""}
                onChange={(e) =>
                  atualizarCampo(index, "edital_id", e.target.value)
                }
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Status da fase</label>
              <AdminSelect
                style={styles.select}
                value={item.status_fase ?? ""}
                onChange={(e) =>
                  atualizarCampo(index, "status_fase", e.target.value)
                }
              >
                {STATUS_FASE_OPTIONS.map((opcao) => (
                  <option key={opcao || "vazio"} value={opcao}>
                    {opcao || "Selecione"}
                  </option>
                ))}
              </AdminSelect>
            </div>

          <div style={styles.fieldWrap}>
  <label style={styles.label}>Resultado preliminar - Arquivo</label>

  <AdminFileInput
    accept="application/pdf"
    style={styles.input}
    onChange={(e) =>
      handleUpload(e, index, "resultado_preliminar_url")
    }
  />

 <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
  
  {item.resultado_preliminar_url && (
    <a
      href={item.resultado_preliminar_url}
      target="_blank"
      rel="noreferrer"
      style={{
        background: "#22c55e",
        color: "#052814",
        padding: "8px 14px",
        borderRadius: 999,
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      📄 Ver documento
    </a>
  )}

  {item.resultado_preliminar_url && (
    <AdminButton
      type="button"
      variant="danger"
      onClick={() =>
        atualizarCampo(index, "resultado_preliminar_url", null)
      }
      style={{
        background: "#ef4444",
        color: "#fff",
        padding: "8px 14px",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      Remover
    </AdminButton>
  )}

</div>
</div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Resultado preliminar - URL</label>
              <AdminInput
                style={styles.input}
                value={item.resultado_preliminar_url ?? ""}
                onChange={(e) =>
                  atualizarCampo(
                    index,
                    "resultado_preliminar_url",
                    e.target.value
                  )
                }
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Prazo recurso - início</label>
              <AdminInput
                type="date"
                style={styles.input}
                value={item.prazo_recurso_inicio ?? ""}
                onChange={(e) =>
                  atualizarCampo(
                    index,
                    "prazo_recurso_inicio",
                    e.target.value
                  )
                }
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Prazo recurso - fim</label>
              <AdminInput
                type="date"
                style={styles.input}
                value={item.prazo_recurso_fim ?? ""}
                onChange={(e) =>
                  atualizarCampo(index, "prazo_recurso_fim", e.target.value)
                }
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Resultado final - título</label>
              <AdminInput
                style={styles.input}
                value={item.resultado_final_titulo ?? ""}
                onChange={(e) =>
                  atualizarCampo(
                    index,
                    "resultado_final_titulo",
                    e.target.value
                  )
                }
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Resultado final - URL</label>
              <AdminInput
                style={styles.input}
                value={item.resultado_final_url ?? ""}
                onChange={(e) =>
                  atualizarCampo(
                    index,
                    "resultado_final_url",
                    e.target.value
                  )
                }
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Homologação - título</label>
              <AdminInput
                style={styles.input}
                value={item.homologacao_titulo ?? ""}
                onChange={(e) =>
                  atualizarCampo(
                    index,
                    "homologacao_titulo",
                    e.target.value
                  )
                }
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Homologação - URL</label>
              <AdminInput
                style={styles.input}
                value={item.homologacao_url ?? ""}
                onChange={(e) =>
                  atualizarCampo(
                    index,
                    "homologacao_url",
                    e.target.value
                  )
                }
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Contrato - título</label>
              <AdminInput
                style={styles.input}
                value={item.contrato_titulo ?? ""}
                onChange={(e) =>
                  atualizarCampo(index, "contrato_titulo", e.target.value)
                }
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Contrato - URL</label>
              <AdminInput
                style={styles.input}
                value={item.contrato_url ?? ""}
                onChange={(e) =>
                  atualizarCampo(index, "contrato_url", e.target.value)
                }
              />
            </div>

            <div style={{ ...styles.fieldWrap, ...styles.full }}>
              <label style={styles.label}>Observações</label>
              <AdminTextarea
                style={styles.textarea}
                value={item.observacoes ?? ""}
                onChange={(e) =>
                  atualizarCampo(index, "observacoes", e.target.value)
                }
              />
            </div>
          </div>

          <div style={styles.footer}>
            <label style={styles.switchRow}>
              <AdminInput
                type="checkbox"
                checked={item.publicado ?? false}
                onChange={(e) =>
                  atualizarCampo(index, "publicado", e.target.checked)
                }
              />
              Publicado
            </label>

            <div style={styles.toolbar}>
              <AdminButton
                type="button"
                variant="primary"
                style={styles.greenBtn}
                onClick={() => salvarBloco(index)}
              >
                Salvar bloco
              </AdminButton>
              <AdminButton
                type="button"
                variant="danger"
                style={styles.redBtn}
                onClick={() => excluirBloco(item.id, index)}
              >
                Excluir bloco
              </AdminButton>
            </div>
          </div>

          {blockMsgs[index] ? (
            <div style={styles.blockMsg}>{blockMsgs[index]}</div>
          ) : null}
        </article>
      ))}
    </section>
  </div>
);
}
