"use client";

import { useEffect, useState } from "react";
import type { Convenio } from "./types";
import { confirmAction, isConfirmModalReady } from "@/components/AdminConfirmModal";
import { TIPO_INSTRUMENTO_OPTIONS, CATEGORIA_OPTIONS, STATUS_CONVENIO_OPTIONS } from "./constants";
import { getConvenios, saveConvenio, deleteConvenio } from "./conveniosService";
import classes from "./page.module.css";
import ConvenioCard from "./components/ConvenioCard";
import { AdminButton, AdminLoadingButton, AdminMessage, AdminSectionHeader, spacing, borderRadius, shadows, sizes, typography } from "@/components/admin";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";
import { triggerToast } from "@/components/AdminToast";

function processoPadrao(processoIds: string[] | "todos"): string | null {
  if (processoIds === "todos") return null;
  if (processoIds.length >= 1) return processoIds[0];
  return null;
}

function novoConvenio(processoId?: string | null): Convenio {
  return {
    edital_id: "",
    processo_id: processoId || null,
    titulo: "",
    numero_instrumento: "",
    tipo_instrumento: "",
    categoria: "",
    objeto: "",
    contratado: "",
    cnpj: "",
    data_assinatura: "",
    vigencia_inicio: "",
    vigencia_fim: "",
    status: "",
    plano_trabalho_url: "",
    documento_principal_url: "",
    relatorio_parcial_url: "",
    relatorio_final_url: "",
    observacoes: "",
    ordem: 0,
    publicado: false,
  };
}

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
    gap: spacing.md,
    flexWrap: "wrap",
    marginTop: spacing.base,
    marginBottom: spacing.sm,
    position: "relative",
    zIndex: 30,
    pointerEvents: "auto",
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
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.extrabold,
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

function getMessageType(message: string): "success" | "error" | "info" {
  if (message.includes("✔") || message.toLowerCase().includes("sucesso") || message.toLowerCase().includes("salvo")) {
    return "success";
  }
  if (message.includes("✘") || message.toLowerCase().includes("erro") || message.toLowerCase().includes("falhou")) {
    return "error";
  }
  return "info";
}

function emptyToNull(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function emptyNumberToNull(value?: number | null) {
  if (value === undefined || value === null) return null;
  return Number.isNaN(value) ? null : value;
}

function normalizeUuid(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(trimmed) ? trimmed : null;
}

export default function TransparenciaConveniosAdmin() {
  const escopo = useAdminEscopoCliente();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [blockMsgs, setBlockMsgs] = useState<Record<number, string>>({});
  const [convenios, setConvenios] = useState<Convenio[]>([]);

  useEffect(() => {
    if (escopo.loading) return;
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo.loading, escopo.processoIds]);

  async function carregar() {
    setLoading(true);
    try {
      const data = await getConvenios(escopo.processoIds);
      setConvenios(
        data && data.length > 0
          ? data
          : [novoConvenio(processoPadrao(escopo.processoIds))]
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Erro ao carregar convênios:", error);
      setMsg(`Erro ao carregar convênios: ${message}`);
      setConvenios([novoConvenio(processoPadrao(escopo.processoIds))]);
    } finally {
      setLoading(false);
    }
  }

  function setBlockMsg(index: number, message: string) {
    setBlockMsgs((prev) => ({ ...prev, [index]: message }));
  }

  function atualizarCampo<K extends keyof Convenio>(index: number, campo: K, valor: Convenio[K]) {
    setConvenios((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  }

  function adicionarBloco() {
    setConvenios((prev) => [
      ...prev,
      novoConvenio(processoPadrao(escopo.processoIds)),
    ]);
    setMsg("Novo bloco de convênio adicionado.");
  }

  function comProcessoDoEscopo(item: Convenio): Convenio {
    if (item.processo_id) return item;
    const pid = processoPadrao(escopo.processoIds);
    return pid ? { ...item, processo_id: pid } : item;
  }

  async function salvarTodos() {
    setMsg("Salvando convênios...");

    for (let i = 0; i < convenios.length; i++) {
      const item = comProcessoDoEscopo(convenios[i]);
      if (
        escopo.processoIds !== "todos" &&
        !item.processo_id
      ) {
        setMsg("Informe o processo do convenio (escopo).");
        setBlockMsg(i, "Processo obrigatório para o seu login.");
        return;
      }
      try {
        await saveConvenio(item);
        setBlockMsg(i, "Bloco salvo com sucesso.");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(error);
        setMsg(`Erro ao salvar convênios: ${message}`);
        setBlockMsg(i, `Erro ao salvar este bloco: ${message}`);
        triggerToast(`Erro ao salvar: ${message}`, "error");
        return;
      }
    }

    await carregar();
    setMsg("Convênios salvos com sucesso.");
    triggerToast("Convênios salvos com sucesso.", "success");
  }

  async function salvarBloco(index: number) {
    const item = comProcessoDoEscopo(convenios[index]);
    setBlockMsg(index, "Salvando este bloco...");

    if (escopo.processoIds !== "todos" && !item.processo_id) {
      setBlockMsg(index, "Processo obrigatório para o seu login.");
      return;
    }

    try {
      await saveConvenio(item);
      await carregar();
      setBlockMsg(index, "Bloco salvo com sucesso.");
      setMsg("Convênio salvo com sucesso.");
      triggerToast("Convênio salvo.", "success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(error);
      setBlockMsg(index, `Erro ao salvar este bloco: ${message}`);
      setMsg(`Erro ao salvar convênios: ${message}`);
      triggerToast(`Erro ao salvar: ${message}`, "error");
    }
  }

  async function excluirBloco(id?: string, index?: number) {
    const idx = index ?? 0;
    const confirmado = await confirmAction("Tem certeza que deseja excluir este convênio? Esta ação não pode ser desfeita.");
    if (!confirmado) {
      const rejeicao = isConfirmModalReady() || !window.confirm("Tem certeza que deseja excluir este convênio? Esta ação não pode ser desfeita.");
      if (rejeicao) {
        setBlockMsg(idx, "Exclusão cancelada.");
        setMsg("Exclusão cancelada.");
        return;
      }
    }

    if (!id) {
      setConvenios((prev) => prev.filter((_, i) => i !== idx));
      setBlockMsg(idx, "Bloco removido da tela.");
      setMsg("Bloco removido da tela.");
      return;
    }

    try {
      await deleteConvenio(id);
      await carregar();
      setMsg("Convênio excluído com sucesso.");
      triggerToast("Convênio excluído.", "success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(error);
      setBlockMsg(idx, `Erro ao excluir este bloco: ${message}`);
      setMsg(`Erro ao excluir convênio: ${message}`);
      triggerToast(`Erro ao excluir: ${message}`, "error");
    }
  }

  if (loading) {
    return (
      <div className={classes.page}>
        <section className={classes.sectionCard}>
          <AdminSectionHeader level={1} style={styles.title}>Tabela de Convênios</AdminSectionHeader>
          <p style={styles.msg}>Carregando...</p>
        </section>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <section className={classes.sectionCard}>
        <AdminSectionHeader level={1} style={styles.title}>Tabela de Convênios</AdminSectionHeader>
        <p style={styles.msg}>
          Cadastre aqui os instrumentos gerados apos a selecao e homologacao.
          A referencia ao edital deve ser preenchida pela equipe responsavel,
          conforme o processo formalizado.
        </p>

        <div className={classes.toolbar}>
          <AdminButton type="button" variant="primary" className={classes.greenBtn} onClick={adicionarBloco}>
            + Adicionar convênio
          </AdminButton>
          <AdminLoadingButton
            type="button"
            variant="primary"
            className={classes.greenBtn}
            onClick={salvarTodos}
            loading={false}
            loadingText="Salvando..."
          >
            Salvar todos
          </AdminLoadingButton>
        </div>

        {msg ? <AdminMessage message={msg} type={getMessageType(msg)} style={styles.msg} /> : null}

        {convenios.map((item, index) => (
          <ConvenioCard
            key={item.id ?? `novo-${index}`}
            item={item}
            index={index}
            blockMsgs={blockMsgs}
            loadingIndex={null}
            loadingOperationType={null}
            updateConvenio={atualizarCampo}
            salvarBloco={salvarBloco}
            excluirBloco={excluirBloco}
          />
        ))}
      </section>
    </div>
  );
}
