"use client";

import { logAction } from "@/lib/logAction";
import { uploadPdfToSupabase } from "@/lib/uploadPdfToSupabase";
import {
  getConvenios,
  getPrestacoes,
  savePrestacao,
  deletePrestacao,
  supabase,
} from "@/services/prestacaoContasService";
import PrestacaoCard from "./components/PrestacaoCard";
import classes from "./page.module.css";
import { AdminButton, AdminMessage, AdminSectionHeader, spacing, borderRadius, shadows, sizes, typography } from "@/components/admin";
import { Convenio, PrestacaoConta, LoadingOperationType, FASE_OPTIONS, STATUS_OPTIONS, TIPO_DOCUMENTO_OPTIONS } from "./index";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";

import { useEffect, useState } from "react";

function processoPadrao(processoIds: string[] | "todos"): string | null {
  if (processoIds === "todos") return null;
  if (processoIds.length === 1) return processoIds[0];
  return processoIds[0] || null;
}

function novaPrestacao(processoId?: string | null): PrestacaoConta {
  return {
    convenio_id: "",
    processo_id: processoId || null,
    fase_prestacao: "",
    status_prestacao: "",
    tipo_documento: "",
    documento_titulo: "",
    documento_url: "",
    referencia_inicio: "",
    referencia_fim: "",
    observacoes: "",
    ordem: 0,
    publicado: true,
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

  sectionTitle: {
    margin: 0,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.extrabold,
    color: "#f8fafc",
  } as React.CSSProperties,

  text: {
    marginTop: spacing.md,
    color: "#cbd5e1",
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
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
    position: "relative",
    zIndex: 40,
    pointerEvents: "auto",
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
    position: "relative",
    zIndex: 40,
    pointerEvents: "auto",
  } as React.CSSProperties,

  recordCard: {
    marginTop: spacing.lg,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    position: "relative",
    zIndex: 1,
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
    position: "relative",
    zIndex: 20,
    pointerEvents: "auto",
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

  helperBox: {
    marginTop: spacing.lg,
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.22)",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    color: "#d1fae5",
    lineHeight: typography.lineHeight.relaxed,
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

export default function TransparenciaPrestacaoAdmin() {
  const escopo = useAdminEscopoCliente();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [blockMsgs, setBlockMsgs] = useState<Record<number, string>>({});
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [loadingOperationType, setLoadingOperationType] =
    useState<LoadingOperationType>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [prestacoes, setPrestacoes] = useState<PrestacaoConta[]>([]);

  async function handleUploadPrestacao(
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingIndex(index);
    setLoadingOperationType("upload");
    setBlockMsg(index, "Enviando...");

    try {
      const url = await uploadPdfToSupabase({
        file,
        bucket: "docs",
        folder: "transparencia/prestacao",
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseClient: supabase,
      });

      updatePrestacao(index, "documento_url", url);
      setSuccess(index, "Upload realizado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro no upload.";
      setError(index, message);
    } finally {
      setLoadingIndex(null);
      setLoadingOperationType(null);
      e.target.value = "";
    }
  }

  useEffect(() => {
    if (escopo.loading) return;

    async function load() {
      setLoading(true);
      let conveniosData: Convenio[] = [];
      let prestacoesData: PrestacaoConta[] = [];
      const pid = processoPadrao(escopo.processoIds);

      try {
        conveniosData = await getConvenios(escopo.processoIds);
      } catch (error) {
        console.error("Erro ao carregar convênios:", error);
      }

      try {
        prestacoesData = await getPrestacoes(escopo.processoIds);
      } catch (error) {
        console.error("Erro ao carregar prestações:", error);
      }

      setConvenios(conveniosData || []);
      setPrestacoes(
        prestacoesData && prestacoesData.length > 0
          ? prestacoesData
          : [novaPrestacao(pid)]
      );

      setLoading(false);
    }

    void load();
  }, [escopo.loading, escopo.processoIds]);

  function setBlockMsg(index: number, message: string) {
    setBlockMsgs((prev) => ({ ...prev, [index]: message }));
  }

  function setSuccess(index: number, message: string) {
    setBlockMsg(index, `✔ ${message}`);
  }

  function setError(index: number, message: string) {
    setBlockMsg(index, `✘ ${message}`);
  }

 function updatePrestacao(
  index: number,
  field: keyof PrestacaoConta,
  value: string | boolean | number | null
) {
  setPrestacoes((prev) => {
    const copia = [...prev];

    if (!copia[index]) return prev;

    copia[index] = {
      ...copia[index],
      [field]: value,
    };

    return copia;
  });

}

  function adicionarPrestacao() {
    setPrestacoes((prev) => [
      ...prev,
      novaPrestacao(processoPadrao(escopo.processoIds)),
    ]);
    setMsg("Novo bloco de prestação adicionado.");
  }

  function getConvenioLabel(convenioId?: string | null) {
    if (!convenioId) return "Convênio não vinculado";
    const convenio = convenios.find((item) => item.id === convenioId);
    if (!convenio) return "Convênio não encontrado";

    const partes = [
      convenio.titulo || "Sem título",
      convenio.numero_instrumento ? `Nº ${convenio.numero_instrumento}` : null,
      convenio.tipo_instrumento || null,
    ].filter(Boolean);

    return partes.join(" • ");
  }

  async function recarregarPrestacoes(successMsg?: string) {
    try {
      const data = await getPrestacoes(escopo.processoIds);
      setPrestacoes(
        data && data.length > 0
          ? data
          : [novaPrestacao(processoPadrao(escopo.processoIds))]
      );
      if (successMsg) setMsg(successMsg);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Erro ao recarregar prestações.";
      setMsg(`Salvou, mas falhou ao recarregar: ${message}`);
    }
  }

  async function salvarTudo() {
    if (loadingOperationType === 'save') {
      return;
    }
    
    setLoadingIndex(0);
    setLoadingOperationType('save');
    setMsg("Salvando...");

    for (let i = 0; i < prestacoes.length; i++) {
      setLoadingIndex(i);
      const item = prestacoes[i];

      if (!item.convenio_id || item.convenio_id.trim() === "") {
        setMsg(`Erro no bloco ${i + 1}: selecione o convênio.`);
        setError(i, 'Campo "Convênio vinculado" é obrigatório.');
        setLoadingIndex(null);
        setLoadingOperationType(null);
        return;
      }

      if (!item.fase_prestacao || item.fase_prestacao.trim() === "") {
        setMsg(`Erro no bloco ${i + 1}: selecione a fase da prestação.`);
        setError(i, 'Campo "Fase da prestação" é obrigatório.');
        setLoadingIndex(null);
        setLoadingOperationType(null);
        return;
      }

      if (!item.status_prestacao || item.status_prestacao.trim() === "") {
        setMsg(`Erro no bloco ${i + 1}: selecione o status da prestação.`);
        setError(i, 'Campo "Status da prestação" é obrigatório.');
        setLoadingIndex(null);
        setLoadingOperationType(null);
        return;
      }

      if (!item.tipo_documento || item.tipo_documento.trim() === "") {
        setMsg(`Erro no bloco ${i + 1}: selecione o tipo de documento.`);
        setError(i, 'Campo "Tipo de documento" é obrigatório.');
        setLoadingIndex(null);
        setLoadingOperationType(null);
        return;
      }

 if (!item.documento_url) {
    setMsg(`Erro no bloco ${i + 1}: envie o documento.`);
    setError(i, "Documento é obrigatório.");
    setLoadingIndex(null);
    setLoadingOperationType(null);
    return;
  }

   const payload = {
  convenio_id: item.convenio_id,
  fase_prestacao: item.fase_prestacao,
  status_prestacao: item.status_prestacao,
  tipo_documento: item.tipo_documento,
  documento_url: item.documento_url,
  referencia_inicio: item.referencia_inicio || null,
  referencia_fim: item.referencia_fim || null,
  ordem: item.ordem || 0,
  publicado: item.publicado ?? true,
};

      let error = null;

      try {
        await savePrestacao({
          ...item,
          convenio_id: item.convenio_id,
          processo_id:
            item.processo_id ||
            convenios.find((c) => c.id === item.convenio_id)?.processo_id ||
            processoPadrao(escopo.processoIds),
          fase_prestacao: item.fase_prestacao,
          status_prestacao: item.status_prestacao,
          tipo_documento: item.tipo_documento,
          documento_url: item.documento_url,
          referencia_inicio: item.referencia_inicio || null,
          referencia_fim: item.referencia_fim || null,
          ordem: item.ordem || 0,
          publicado: item.publicado ?? true,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao salvar prestações.";
        console.error(error);
        setMsg(`Erro ao salvar prestações: ${message}`);
        setError(i, `Erro: ${message}`);
        setLoadingIndex(null);
        setLoadingOperationType(null);
        return;
      }


await logAction({
  acao: item.id ? "UPDATE" : "INSERT",
  tabela: "transparencia_prestacao_contas",
  registro_id: item.id || "novo",
  dados: payload,
});

      setSuccess(i, "Salvo com sucesso");
    }

    setLoadingIndex(null);
    setLoadingOperationType(null);
    await recarregarPrestacoes("Tudo salvo com sucesso");
  }

 async function salvarBloco(index: number) {
  if (loadingIndex === index && loadingOperationType === 'save') {
    return;
  }

  const item = prestacoes[index];

  if (!item.convenio_id || item.convenio_id.trim() === "") {
    setError(index, "Selecione o convênio.");
    return;
  }

  if (!item.fase_prestacao || item.fase_prestacao.trim() === "") {
    setError(index, "Informe a fase.");
    return;
  }

  if (!item.status_prestacao || item.status_prestacao.trim() === "") {
    setError(index, "Informe o status.");
    return;
  }

  if (!item.tipo_documento || item.tipo_documento.trim() === "") {
    setError(index, "Informe o tipo de documento.");
    return;
  }

  if (!item.documento_url) {
    setError(index, "Envie o documento antes de salvar.");
    return;
  }

  setLoadingIndex(index);
  setLoadingOperationType('save');
  setBlockMsg(index, "Salvando...");

  const payload = {
    convenio_id: item.convenio_id,
    fase_prestacao: item.fase_prestacao,
    status_prestacao: item.status_prestacao,
    tipo_documento: item.tipo_documento,
    documento_url: item.documento_url,
    referencia_inicio: item.referencia_inicio || null,
    referencia_fim: item.referencia_fim || null,
    ordem: item.ordem || 0,
    publicado: item.publicado ?? true,
  };

  let error = null;

  try {
    const response = await savePrestacao({
      ...item,
      convenio_id: item.convenio_id,
      processo_id:
        item.processo_id ||
        convenios.find((c) => c.id === item.convenio_id)?.processo_id ||
        processoPadrao(escopo.processoIds),
      fase_prestacao: item.fase_prestacao,
      status_prestacao: item.status_prestacao,
      tipo_documento: item.tipo_documento,
      documento_url: item.documento_url,
      referencia_inicio: item.referencia_inicio || null,
      referencia_fim: item.referencia_fim || null,
      ordem: item.ordem || 0,
      publicado: item.publicado ?? true,
    });

    if (!item.id && response?.id) {
      const novos = [...prestacoes];
      novos[index].id = response.id;
      setPrestacoes(novos);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar.";
    console.error(error);
    setError(index, message);
    setLoadingIndex(null);
    setLoadingOperationType(null);
    return;
  }

  await logAction({
    acao: item.id ? "UPDATE" : "INSERT",
    tabela: "transparencia_prestacao_contas",
    registro_id: item.id || "novo",
    dados: payload,
  });

  setSuccess(index, "Salvo com sucesso");
  setLoadingIndex(null);
  setLoadingOperationType(null);
}
 async function excluirBloco(id: string, index: number) {
  if (loadingIndex === index && loadingOperationType === 'delete') {
    return;
  }

  const confirmado = window.confirm(
    "Tem certeza que deseja excluir esta prestação de contas?"
  );

  if (!confirmado) {
    return;
  }

  setLoadingIndex(index);
  setLoadingOperationType('delete');
  setBlockMsg(index, "Excluindo...");

  try {
    await deletePrestacao(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir.";
    console.error(error);
    setError(index, message);
    setLoadingIndex(null);
    setLoadingOperationType(null);
    return;
  }

  await logAction({
    acao: "DELETE",
    tabela: "transparencia_prestacao_contas",
    registro_id: id,
  });

  setSuccess(index, "Excluído com sucesso");
  setLoadingIndex(null);
  setLoadingOperationType(null);
  
  setPrestacoes((prev) => prev.filter((_, i) => i !== index));
}

  if (loading) {
    return (
      <div className="admin-card">
        <AdminSectionHeader level={1}>Prestação de Contas</AdminSectionHeader>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <section className={classes.sectionCard}>
        <AdminSectionHeader level={1} style={styles.title}>Prestação de Contas</AdminSectionHeader>
        <p style={styles.text}>
          Cadastre a prestação de contas vinculada aos convênios firmados,
          organizando por <strong>fase</strong>, <strong>status</strong> e{" "}
          <strong>tipologia documental</strong>.
        </p>

        <div style={styles.helperBox}>
          Esta página foi estruturada para refletir a hierarquia real da execução:
          <br />
          <strong>Convênio → Fase da prestação → Tipo de documento → Documento</strong>
        </div>

        <div className={classes.toolbar}>
          <AdminButton type="button" variant="primary" className={classes.greenBtn} onClick={adicionarPrestacao}>
            + Adicionar bloco
          </AdminButton>
          <AdminButton
            type="button"
            variant="primary"
            className={classes.greenBtn}
            onClick={salvarTudo}
            disabled={loadingOperationType === 'save'}
          >
            {loadingOperationType === 'save' ? 'Salvando...' : 'Salvar tudo'}
          </AdminButton>
        </div>

        {msg ? <AdminMessage message={msg} type={getMessageType(msg)} style={styles.msg} /> : null}

        {prestacoes.map((item, index) => (
          <PrestacaoCard
            key={item.id || `prestacao-${index}`}
            item={item}
            index={index}
            convenios={convenios}
            blockMsgs={blockMsgs}
            loadingIndex={loadingIndex}
            loadingOperationType={loadingOperationType}
            getConvenioLabel={getConvenioLabel}
            updatePrestacao={updatePrestacao}
            handleUploadPrestacao={handleUploadPrestacao}
            salvarBloco={salvarBloco}
            excluirBloco={excluirBloco}
          />
        ))}      </section>
    </div>
  );
}
