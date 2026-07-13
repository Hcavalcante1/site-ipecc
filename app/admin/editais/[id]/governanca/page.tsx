"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { confirmAction } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";
import { AdminLoadingButton } from "@/components/admin";
import { adminStorageUpload } from "@/lib/admin/storageUploadClient";
import { supabase } from "@/lib/supabaseClient";
import {
  getFasesGovernancaAdmin,
  indiceFaseGovernancaAdmin,
  labelFaseAdmin,
  sincronizarFaseComModalidade,
} from "@/lib/editais/fasesAdmin";
import {
  isEditalFaseRascunho,
  MSG_SAIDA_RASCUNHO,
} from "@/lib/editais/governancaRules";
import { isModalidadeCotacaoPrevia } from "@/lib/editais/tiposAdmin";
import AssinarNoAdminModal from "@/app/admin/documentos/components/AssinarNoAdminModal";

type Edital = {
  id: string;
  titulo?: string | null;
  tipo?: string | null;
  status?: string | null;
  periodo?: string | null;
  periodo_envio?: string | null;
  arquivo_pdf?: string | null;
  fase_atual?: string | null;
  recebimento_inicio?: string | null;
  recebimento_fim?: string | null;
};

type DocumentoPublico = {
  id: string;
  tipo: string;
  fase?: string | null;
  titulo: string;
  descricao?: string | null;
  arquivo_url: string;
  publicado?: boolean | null;
  publicado_em?: string | null;
  created_at?: string | null;
};

type EditalLog = {
  id: string;
  usuario_email?: string | null;
  acao: string;
  fase_anterior?: string | null;
  fase_nova?: string | null;
  observacao?: string | null;
  created_at?: string | null;
};

type Proposta = {
  id: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  cnpj?: string | null;
  tipo?: string | null;
  categoria?: string | null;
  status?: string | null;
  criado_em?: string | null;
  created_at?: string | null;
};

type ModeloOficial = {
  id: string;
  slug: string;
  titulo: string;
  tipo_emissao: string;
  tipo_publicacao: string;
};

type EmissaoOficial = {
  id: string;
  tipo_emissao: string;
  titulo: string;
  status: string;
  gd_document_id?: string | null;
  arquivo_url_publico?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  publicado_em?: string | null;
};

const LABEL_STATUS_EMISSAO: Record<string, string> = {
  gerado: "Gerado",
  aguardando_assinatura: "Aguardando assinatura",
  assinado: "Assinado",
  publicado: "Publicado",
  erro_assinatura: "Erro na assinatura",
  erro_publicacao: "Erro na publicação",
};

const TIPOS_DOCUMENTO = [
  "edital",
  "anexo",
  "ata",
  "parecer",
  "recurso",
  "julgamento",
  "resultado_preliminar",
  "resultado_final",
  "homologacao",
  "adjudicacao",
  "contrato",
  "termo_parceria",
  "prestacao_de_contas",
  "encerramento",
];

/** Tipos relevantes para Cotação prévia (já existem no constraint do banco). */
const TIPOS_DOCUMENTO_COTACAO = [
  "edital",
  "anexo",
  "ata",
  "parecer",
  "resultado_final",
  "encerramento",
] as const;

const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  edital: "Edital",
  anexo: "Anexo",
  ata: "Ata",
  parecer: "Parecer",
  recurso: "Recurso",
  julgamento: "Julgamento",
  resultado_preliminar: "Resultado preliminar",
  resultado_final: "Resultado final",
  homologacao: "Homologacao",
  adjudicacao: "Adjudicacao",
  contrato: "Contrato",
  termo_parceria: "Termo de parceria",
  prestacao_de_contas: "Prestacao de contas",
  encerramento: "Encerramento",
};

const TIPO_DOCUMENTO_LABELS_COTACAO: Record<string, string> = {
  edital: "Termo de referência / Instrumento da cotação",
  anexo: "Anexo (planilha, TR, memorial)",
  ata: "Ata de decisão / análise técnica",
  parecer: "Parecer técnico",
  resultado_final: "Resultado da cotação",
  encerramento: "Encerramento da cotação",
};

/** Documentos esperados por fase na cotação prévia. */
const DOCS_SUGERIDOS_COTACAO: Record<
  string,
  { tipos: string[]; orientacao: string }
> = {
  publicado: {
    tipos: ["edital", "anexo"],
    orientacao:
      "Publique o termo de referência e anexos oficiais da cotação.",
  },
  recebimento_propostas: {
    tipos: ["anexo"],
    orientacao:
      "Se necessário, publique esclarecimentos ou anexos complementares do período de recebimento.",
  },
  analise: {
    tipos: ["ata", "parecer"],
    orientacao:
      "Publique a ata de decisão da análise técnica e/ou parecer técnico.",
  },
  resultado_final: {
    tipos: ["resultado_final", "ata"],
    orientacao:
      "Publique o resultado da cotação e, se houver, a ata de homologação da escolha.",
  },
  encerrado: {
    tipos: ["encerramento"],
    orientacao: "Publique o documento de encerramento do processo, se aplicável.",
  },
};

function labelTipoDocumento(valor?: string | null, cotacao = false) {
  if (!valor) return "-";
  if (cotacao && TIPO_DOCUMENTO_LABELS_COTACAO[valor]) {
    return TIPO_DOCUMENTO_LABELS_COTACAO[valor];
  }
  return TIPO_DOCUMENTO_LABELS[valor] || valor.replace(/_/g, " ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function normalizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function downloadUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api/download/")) return path;
  return `/api/download/docs/${path}`;
}

export default function GovernancaEditalPage() {
  const params = useParams();
  const editalId = String(params.id ?? "");

  const [edital, setEdital] = useState<Edital | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoPublico[]>([]);
  const [logs, setLogs] = useState<EditalLog[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [faseMsg, setFaseMsg] = useState("");
  const [docMsg, setDocMsg] = useState("");

  const [novaFase, setNovaFase] = useState("");
  const [observacao, setObservacao] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  const [docTipo, setDocTipo] = useState("resultado_preliminar");
  const [docFase, setDocFase] = useState("resultado_preliminar");
  const [docTitulo, setDocTitulo] = useState("");
  const [docDescricao, setDocDescricao] = useState("");
  const [docArquivo, setDocArquivo] = useState<File | null>(null);

  const [modelosOficiais, setModelosOficiais] = useState<ModeloOficial[]>([]);
  const [emissoesOficiais, setEmissoesOficiais] = useState<EmissaoOficial[]>(
    []
  );
  const [tipoEmissaoOficial, setTipoEmissaoOficial] = useState("");
  const [signatarioNome, setSignatarioNome] = useState("");
  const [signatarioEmail, setSignatarioEmail] = useState("");
  const [oficialMsg, setOficialMsg] = useState("");
  const [oficialSaving, setOficialSaving] = useState(false);
  const [oficialEmbedOpen, setOficialEmbedOpen] = useState(false);
  const [oficialEmbedUrl, setOficialEmbedUrl] = useState<string | null>(null);
  const [oficialSigningUrl, setOficialSigningUrl] = useState<string | null>(
    null
  );

  const fases = useMemo(
    () => [...getFasesGovernancaAdmin(edital?.tipo)],
    [edital?.tipo]
  );
  const isCotacao = isModalidadeCotacaoPrevia(edital?.tipo);
  const label = (valor?: string | null) =>
    labelFaseAdmin(valor, edital?.tipo) || "-";

  const faseAtual = edital?.fase_atual || "rascunho";
  const faseAtualIndex = indiceFaseGovernancaAdmin(faseAtual, edital?.tipo);
  const proximaFase = fases[faseAtualIndex + 1] || null;
  const documentosOrdenados = useMemo(() => {
    return [...documentos].sort((a, b) => {
      const faseA = fases.indexOf(a.fase || "");
      const faseB = fases.indexOf(b.fase || "");
      const ordemFaseA = faseA === -1 ? 999 : faseA;
      const ordemFaseB = faseB === -1 ? 999 : faseB;

      if (ordemFaseA !== ordemFaseB) return ordemFaseA - ordemFaseB;

      const dataA = new Date(a.publicado_em || a.created_at || 0).getTime();
      const dataB = new Date(b.publicado_em || b.created_at || 0).getTime();
      return dataB - dataA;
    });
  }, [documentos, fases]);
  const checklistGovernanca = useMemo(() => {
    const temDocumento = (tipo: string) =>
      documentos.some((doc) => doc.tipo === tipo);
    const temDocumentoNaFase = (fase: string, tipos: string[]) =>
      documentos.some(
        (doc) =>
          (doc.fase === fase || !doc.fase) && tipos.includes(doc.tipo)
      ) || documentos.some((doc) => tipos.includes(doc.tipo));

    if (isCotacao) {
      return [
        {
          label: "Publicação — termo/anexos da cotação",
          done:
            !!edital?.arquivo_pdf ||
            temDocumento("edital") ||
            temDocumento("anexo"),
        },
        {
          label: "Análise — ata ou parecer técnico",
          done: temDocumento("ata") || temDocumento("parecer"),
        },
        {
          label: "Resultado final publicado",
          done: temDocumento("resultado_final"),
        },
        {
          label: "Encerramento (se aplicável)",
          done:
            faseAtualIndex >= fases.indexOf("encerrado") ||
            temDocumento("encerramento") ||
            temDocumentoNaFase("encerrado", ["encerramento"]),
        },
      ];
    }

    return [
      {
        label: "Edital publicado",
        done: !!edital?.arquivo_pdf || temDocumento("edital"),
      },
      {
        label: "Resultado preliminar publicado",
        done: temDocumento("resultado_preliminar"),
      },
      {
        label: "Fase de recursos registrada",
        done: faseAtualIndex >= fases.indexOf("recurso"),
      },
      {
        label: "Resultado final publicado",
        done: temDocumento("resultado_final"),
      },
      {
        label: "Homologacao publicada",
        done: temDocumento("homologacao"),
      },
      {
        label: "Contrato ou termo publicado",
        done: temDocumento("contrato") || temDocumento("termo_parceria"),
      },
      {
        label: "Prestacao de contas vinculada",
        done: temDocumento("prestacao_de_contas"),
      },
    ];
  }, [
    documentos,
    edital?.arquivo_pdf,
    faseAtualIndex,
    fases,
    isCotacao,
  ]);

  const resumoPropostas = useMemo(() => {
    const porStatus = (status: string) =>
      propostas.filter((proposta) => (proposta.status || "pendente") === status)
        .length;

    const ultima = [...propostas]
      .sort((a, b) => {
        const dataA = new Date(a.criado_em || a.created_at || 0).getTime();
        const dataB = new Date(b.criado_em || b.created_at || 0).getTime();
        return dataB - dataA;
      })[0];

    return {
      total: propostas.length,
      pendentes: porStatus("pendente"),
      aprovadas: porStatus("aprovado"),
      rejeitadas: porStatus("rejeitado"),
      ultimaData: ultima?.criado_em || ultima?.created_at || null,
    };
  }, [propostas]);

  const pendencias = useMemo(() => {
    const itens: string[] = [];
    if (!edital?.arquivo_pdf) itens.push("PDF oficial do edital ainda não identificado.");
    if (!edital?.periodo && !edital?.periodo_envio) itens.push("Período do edital não informado.");

    if (isCotacao) {
      if (faseAtual === "publicado") {
        const temBase =
          !!edital?.arquivo_pdf ||
          documentos.some((doc) => doc.tipo === "edital" || doc.tipo === "anexo");
        if (!temBase) {
          itens.push("Publique o termo de referência ou anexo oficial da cotação.");
        }
      }
      if (faseAtual === "analise") {
        const temAnalise = documentos.some(
          (doc) => doc.tipo === "ata" || doc.tipo === "parecer"
        );
        if (!temAnalise) {
          itens.push(
            "Publique a ata de decisão da análise técnica ou o parecer técnico."
          );
        }
      }
      if (faseAtual === "resultado_final") {
        const temResultado = documentos.some((doc) => doc.tipo === "resultado_final");
        if (!temResultado) {
          itens.push("Resultado da cotação ainda não publicado.");
        }
      }
      return itens;
    }

    if (faseAtual === "resultado_preliminar") {
      const temResultado = documentos.some((doc) => doc.tipo === "resultado_preliminar");
      if (!temResultado) itens.push("Resultado preliminar ainda não publicado.");
    }
    if (faseAtual === "homologado") {
      const temHomologacao = documentos.some((doc) => doc.tipo === "homologacao");
      if (!temHomologacao) itens.push("Documento de homologação ainda não publicado.");
    }
    if (faseAtual === "contratado") {
      const temContrato = documentos.some(
        (doc) => doc.tipo === "contrato" || doc.tipo === "termo_parceria"
      );
      if (!temContrato) itens.push("Contrato ou termo de parceria ainda não publicado.");
    }
    return itens;
  }, [documentos, edital, faseAtual, isCotacao]);

  const tiposDocumentoDisponiveis = useMemo(
    () => (isCotacao ? [...TIPOS_DOCUMENTO_COTACAO] : TIPOS_DOCUMENTO),
    [isCotacao]
  );

  const sugestaoDocsFase =
    isCotacao && DOCS_SUGERIDOS_COTACAO[faseAtual]
      ? DOCS_SUGERIDOS_COTACAO[faseAtual]
      : null;

  useEffect(() => {
    if (!edital) return;

    const fasePadrao =
      faseAtual && faseAtual !== "rascunho" ? faseAtual : "publicado";
    setDocFase((atual) =>
      fases.includes(atual) ? atual : fasePadrao
    );

    if (isCotacao) {
      const sugeridos = DOCS_SUGERIDOS_COTACAO[fasePadrao]?.tipos;
      setDocTipo((atual) =>
        (TIPOS_DOCUMENTO_COTACAO as readonly string[]).includes(atual)
          ? atual
          : sugeridos?.[0] || "edital"
      );
    }
  }, [edital, faseAtual, fases, isCotacao]);

  async function carregar() {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`/api/admin/governanca/${editalId}`, {
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMsg(json.error || "Erro ao carregar governanca.");
        return;
      }

      setEdital(json.edital);
      setDocumentos(json.documentos || []);
      setLogs(json.logs || []);
      setPropostas(json.propostas || []);
      setNovaFase(
        sincronizarFaseComModalidade(
          json.edital?.fase_atual,
          json.edital?.tipo
        )
      );

      await carregarEmissoesOficiais();
    } catch {
      setMsg("Erro inesperado ao carregar governanca.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarEmissoesOficiais() {
    try {
      const res = await fetch(
        `/api/admin/editais/${editalId}/gerar-assinar-publicar`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setOficialMsg(
          json.error ||
            json.warnings?.modelos ||
            json.warnings?.emissoes ||
            ""
        );
        return;
      }
      const modelos = (json.modelos || []) as ModeloOficial[];
      setModelosOficiais(modelos);
      setEmissoesOficiais(json.emissoes || []);
      setTipoEmissaoOficial((atual) => {
        if (atual && modelos.some((m) => m.tipo_emissao === atual)) return atual;
        return modelos[0]?.tipo_emissao || "";
      });
      setOficialMsg("");
    } catch {
      setOficialMsg("Não foi possível carregar documentos oficiais.");
    }
  }

  async function gerarAssinarPublicar(
    modo: "eu_assino" | "enviar_signatarios" = "eu_assino"
  ) {
    if (!tipoEmissaoOficial) {
      setOficialMsg("Selecione o tipo de documento oficial.");
      return;
    }
    if (modo === "enviar_signatarios") {
      if (!signatarioEmail.trim() || !signatarioEmail.includes("@")) {
        setOficialMsg("Informe o e-mail válido do signatário.");
        return;
      }
    }

    setOficialSaving(true);
    setOficialMsg("");
    try {
      const res = await fetch(
        `/api/admin/editais/${editalId}/gerar-assinar-publicar`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipoEmissao: tipoEmissaoOficial,
            modo,
            signatario: {
              nome: signatarioNome.trim(),
              email: signatarioEmail.trim(),
            },
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setOficialMsg(json.error || "Falha ao gerar e enviar para assinatura.");
        triggerToast(
          json.error || "Falha ao gerar documento oficial.",
          "error"
        );
        return;
      }
      setOficialMsg(json.aviso || "Documento gerado.");
      await carregarEmissoesOficiais();

      if (modo === "eu_assino" && (json.embedUrl || json.signingUrl)) {
        setOficialEmbedUrl(json.embedUrl || null);
        setOficialSigningUrl(json.signingUrl || null);
        setOficialEmbedOpen(true);
        triggerToast("Documento gerado — assine no painel.", "success");
      } else {
        triggerToast(
          modo === "eu_assino"
            ? "Documento gerado. Abra Assinaturas se o painel não abrir."
            : "Documento gerado e enviado para assinatura.",
          "success"
        );
      }
    } catch {
      setOficialMsg("Erro inesperado ao gerar documento oficial.");
      triggerToast("Erro inesperado ao gerar documento oficial.", "error");
    } finally {
      setOficialSaving(false);
    }
  }

  useEffect(() => {
    if (editalId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editalId]);

  async function atualizarStatusProposta(
    propostaId: string,
    status: "aprovado" | "rejeitado"
  ) {
    setSaving(true);
    setMsg("");

    try {
      const { error } = await supabase
        .from("propostas")
        .update({ status })
        .eq("id", propostaId);

      if (error) {
        triggerToast("Erro ao atualizar status da proposta.", "error");
        return;
      }

      await registrarLog(
        status === "aprovado" ? "proposta_aprovada" : "proposta_rejeitada",
        {
          observacao: `Proposta ${propostaId} marcada como ${status} pela governanca do edital.`,
        }
      );

      triggerToast(
        status === "aprovado" ? "Proposta aprovada." : "Proposta rejeitada.",
        "success"
      );

      if (status === "aprovado") {
        const ponte = await fetch("/api/admin/transparencia/ponte", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acao: "convenio_de_proposta",
            propostaId,
          }),
        })
          .then((r) => r.json())
          .catch(() => null);

        if (ponte?.ok) {
          triggerToast(
            ponte.message || "Rascunho de convenio criado na Transparencia.",
            "success"
          );
        } else if (ponte?.error) {
          triggerToast(
            `Proposta aprovada, mas a ponte falhou: ${ponte.error}`,
            "error"
          );
        }
      }

      await carregar();
    } catch {
      triggerToast("Erro inesperado ao atualizar proposta.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function registrarLog(
    acao: string,
    extras: Partial<EditalLog> & { documento_id?: string | null } = {}
  ) {
    await supabase.from("editais_logs").insert({
      edital_id: editalId,
      usuario_email: "admin@ipecc.org.br",
      acao,
      fase_anterior: extras.fase_anterior ?? null,
      fase_nova: extras.fase_nova ?? null,
      documento_id: extras.documento_id ?? null,
      observacao: extras.observacao ?? null,
    });
  }

  async function avancarFase() {
    setSaving(true);
    setMsg("");
    setFaseMsg("");

    try {
      if (!novaFase) {
        setFaseMsg("Selecione a nova fase.");
        triggerToast("Selecione a nova fase.", "error");
        return;
      }
      if (novaFase === faseAtual) {
        setFaseMsg("Selecione uma fase diferente da fase atual.");
        triggerToast("Selecione uma fase diferente da fase atual.", "error");
        return;
      }
      if (!observacao.trim()) {
        setFaseMsg("Informe uma observacao institucional para a mudanca de fase.");
        triggerToast("Informe uma observacao institucional.", "error");
        return;
      }
      if (!confirmado) {
        setFaseMsg("Confirme que a mudanca representa uma decisao humana e institucional.");
        triggerToast("Confirme a decisao institucional.", "error");
        return;
      }

      const avisoRascunho =
        isEditalFaseRascunho(faseAtual) && !isEditalFaseRascunho(novaFase)
          ? ` ${MSG_SAIDA_RASCUNHO}`
          : "";

      const podeAvancar = await confirmAction(
        `Confirmar mudanca de fase para "${label(novaFase)}"? Esta acao sera registrada no historico institucional do edital.${avisoRascunho}`
      );

      if (!podeAvancar) {
        setFaseMsg("Mudanca de fase cancelada.");
        return;
      }

      const faseAnterior = faseAtual;
      const res = await fetch("/api/admin/mutate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "editais",
          action: "update",
          payload: { fase_atual: novaFase },
          filters: [{ column: "id", value: editalId }],
          select: "id",
          single: true,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        const erro = json.error || "Erro ao atualizar fase.";
        setFaseMsg(`Erro ao atualizar fase: ${erro}`);
        triggerToast(erro, "error");
        return;
      }

      await registrarLog("fase_alterada", {
        fase_anterior: faseAnterior,
        fase_nova: novaFase,
        observacao,
      });

      setObservacao("");
      setConfirmado(false);
      setFaseMsg(`Fase atualizada para "${label(novaFase)}".`);
      triggerToast("Fase atualizada com sucesso.", "success");

      if (novaFase === "prestacao_contas" && editalId) {
        const ponte = await fetch("/api/admin/transparencia/ponte", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acao: "prestacoes_do_edital",
            editalId,
          }),
        })
          .then((r) => r.json())
          .catch(() => null);

        if (ponte?.ok && ponte.message) {
          triggerToast(String(ponte.message), "success");
          triggerToast(
            "Abra Prestação (painel) para revisar os rascunhos.",
            "success"
          );
        }
      }

      await carregar();
    } finally {
      setSaving(false);
    }
  }

  async function publicarDocumento() {
    setSaving(true);
    setMsg("");
    setDocMsg("");

    try {
      if (!docTitulo.trim()) {
        setDocMsg("Informe o titulo do documento.");
        triggerToast("Informe o titulo do documento.", "error");
        return;
      }
      if (!docArquivo) {
        setDocMsg("Selecione um PDF para publicar.");
        triggerToast("Selecione um PDF para publicar.", "error");
        return;
      }
      if (docArquivo.type && docArquivo.type !== "application/pdf") {
        setDocMsg("Use apenas arquivo PDF.");
        triggerToast("Use apenas arquivo PDF.", "error");
        return;
      }

      const podePublicar = await confirmAction(
        `Confirmar publicacao do documento "${docTitulo}"? Ele ficara registrado como documento oficial deste edital.`
      );

      if (!podePublicar) {
        setDocMsg("Publicacao de documento cancelada.");
        return;
      }

      const nomeSeguro = normalizeFileName(docArquivo.name);
      const path = `governanca-editais/${editalId}/${Date.now()}-${nomeSeguro}`;

      const upload = await adminStorageUpload("docs", path, docArquivo, {
        upsert: true,
        contentType: "application/pdf",
      });

      if (upload.error) {
        setDocMsg(`Erro ao enviar documento: ${upload.error.message}`);
        triggerToast("Erro ao enviar documento.", "error");
        return;
      }

      const { data, error } = await (async () => {
        const res = await fetch("/api/admin/mutate", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: "documentos_publicos",
            action: "insert",
            payload: {
              edital_id: editalId,
              tipo: docTipo,
              fase: docFase || null,
              titulo: docTitulo,
              descricao: docDescricao || null,
              arquivo_url: path,
              publicado: true,
              publicado_em: new Date().toISOString(),
            },
            select: "id",
            single: true,
          }),
        });

        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          data?: { id?: string } | null;
        };

        if (!res.ok || !json.ok) {
          return {
            data: null,
            error: { message: json.error || "Erro ao publicar documento." },
          };
        }

        return { data: json.data ?? null, error: null };
      })();

      if (error) {
        setDocMsg(`Erro ao publicar documento: ${error.message}`);
        triggerToast("Erro ao publicar documento.", "error");
        return;
      }

      await registrarLog("documento_publicado", {
        fase_nova: docFase || null,
        documento_id: (data as { id?: string } | null)?.id ?? null,
        observacao: docTitulo,
      });

      setDocTitulo("");
      setDocDescricao("");
      setDocArquivo(null);
      setDocMsg("Documento publicado com sucesso.");
      triggerToast("Documento publicado com sucesso.", "success");

      if (editalId) {
        await fetch("/api/admin/transparencia/ponte", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acao: "espelhar_documento",
            editalId,
            documento: {
              tipo: docTipo,
              titulo: docTitulo,
              arquivo_url: path,
            },
          }),
        }).catch(() => null);
      }

      await carregar();
    } finally {
      setSaving(false);
    }
  }

  async function excluirDocumento(doc: DocumentoPublico) {
    setSaving(true);
    setMsg("");
    setDocMsg("");

    try {
      const podeExcluir = await confirmAction(
        `Excluir o documento "${doc.titulo}" da governanca deste edital? O registro deixara de aparecer na Transparencia.`
      );

      if (!podeExcluir) {
        setDocMsg("Exclusao de documento cancelada.");
        return;
      }

      const res = await fetch("/api/admin/mutate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "documentos_publicos",
          action: "delete",
          filters: [
            { column: "id", value: doc.id },
            { column: "edital_id", value: editalId },
          ],
          select: "id",
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        const erro = json.error || "Erro ao excluir documento.";
        setDocMsg(`Erro ao excluir documento: ${erro}`);
        triggerToast("Erro ao excluir documento.", "error");
        return;
      }

      setDocMsg("Documento excluido da governanca.");
      triggerToast("Documento excluido com sucesso.", "success");
      await carregar();
    } finally {
      setSaving(false);
    }
  }

  async function excluirLog(log: EditalLog) {
    setSaving(true);
    setMsg("");

    try {
      const podeExcluir = await confirmAction(
        `Excluir este registro do historico institucional? Use apenas para remover testes ou registros lancados por engano.`
      );

      if (!podeExcluir) {
        setMsg("Exclusao de registro cancelada.");
        return;
      }

      const { error } = await supabase
        .from("editais_logs")
        .delete()
        .eq("id", log.id);

      if (error) {
        setMsg(`Erro ao excluir registro: ${error.message}`);
        triggerToast("Erro ao excluir registro.", "error");
        return;
      }

      setMsg("Registro removido do historico.");
      triggerToast("Registro excluido com sucesso.", "success");
      await carregar();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ padding: 24 }}>Carregando governanca...</p>;

  if (!edital) {
    return (
      <div className="admin-box">
        <p className="admin-subtitle">
          <Link href="/admin/editais">Voltar para editais</Link>
        </p>
        <h1 className="admin-h1">Acesso negado ou edital indisponivel</h1>
        <p>
          {msg ||
            "Este edital não está no seu processo, ou não foi encontrado."}
        </p>
      </div>
    );
  }

  return (
    <div className="admin-box">
      <p className="admin-subtitle">
        <Link href="/admin/editais">Voltar para editais</Link>
      </p>

      <h1 className="admin-h1">Governanca do edital</h1>
      <p className="admin-subtitle">
        Controle institucional das fases, documentos e registros. A decisao
        continua humana; o sistema apenas organiza e registra. A publicacao das
        fases e documentos oficiais aparece na pagina publica Transparencia.
      </p>

      {msg && <p className="admin-card">{msg}</p>}

      <section className="admin-card">
        <h2 className="admin-h2">{edital.titulo}</h2>
        <p><strong>Tipo:</strong> {edital.tipo || "-"}</p>
        <p><strong>Status público:</strong> {edital.status || "-"}</p>
        <p><strong>Periodo:</strong> {edital.periodo || edital.periodo_envio || "-"}</p>
        <p><strong>Fase atual:</strong> {label(faseAtual)}</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          <div
            style={{
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 14,
              padding: "12px 14px",
              background: "rgba(15,23,42,.34)",
            }}
          >
            <strong>Visibilidade publica</strong>
            <p style={{ marginBottom: 0 }}>
              {faseAtual === "rascunho"
                ? "Interno: não aparece na Transparência."
                : "Publicado: aparece na Transparencia."}
            </p>
          </div>
          <div
            style={{
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 14,
              padding: "12px 14px",
              background: "rgba(15,23,42,.34)",
            }}
          >
            <strong>Proximo passo</strong>
            <p style={{ marginBottom: 0 }}>
              {proximaFase
                ? `Avaliar avanco para ${label(proximaFase)}.`
                : "Fluxo institucional encerrado."}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <Link className="admin-button" href={`/editais/${edital.id}`} target="_blank">
            Ver edital público
          </Link>
          <Link className="admin-button" href="/transparencia" target="_blank">
            Ver Transparencia (site)
          </Link>
          <Link
            className="admin-button"
            href="/admin/paginas/transparencia/convenios"
          >
            Convênios (painel)
          </Link>
          <Link
            className="admin-button"
            href="/admin/paginas/transparencia/prestacao"
          >
            Prestação (painel)
          </Link>
          <Link className="admin-button" href={`/admin/editais/${edital.id}`}>
            Editar cadastro
          </Link>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Linha do tempo institucional</h2>
        <p>
          Acompanhe a posicao atual do edital. A linha do tempo e apenas
          orientativa; cada mudanca continua dependendo de decisao humana.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {fases.map((fase, index) => {
            const concluida = index < faseAtualIndex;
            const atual = index === faseAtualIndex;
            const docsNaFase = documentos.filter((doc) => doc.fase === fase).length;
            const sugestao = isCotacao ? DOCS_SUGERIDOS_COTACAO[fase] : null;

            return (
              <div
                key={fase}
                style={{
                  borderRadius: 12,
                  border: atual
                    ? "1px solid rgba(34,197,94,.72)"
                    : "1px solid rgba(255,255,255,.16)",
                  background: atual
                    ? "rgba(34,197,94,.16)"
                    : concluida
                    ? "rgba(14,165,233,.12)"
                    : "rgba(15,23,42,.36)",
                  padding: 14,
                }}
              >
                <strong>{label(fase)}</strong>
                <p style={{ marginTop: 6, marginBottom: 0 }}>
                  {atual ? "Fase atual" : concluida ? "Etapa anterior" : "Etapa futura"}
                </p>
                <p style={{ marginTop: 6, marginBottom: 0, fontSize: 13, opacity: 0.9 }}>
                  {docsNaFase > 0
                    ? `${docsNaFase} documento(s) vinculado(s)`
                    : "Sem documento vinculado"}
                </p>
                {sugestao ? (
                  <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12, opacity: 0.8 }}>
                    Ex.:{" "}
                    {sugestao.tipos
                      .map((tipo) => labelTipoDocumento(tipo, true))
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Lista de verificação operacional</h2>
        <p>
          Use este resumo para conferir se os marcos documentais principais ja
          foram registrados. Ele nao substitui a analise humana do edital.
        </p>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {checklistGovernanca.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                border: "1px solid rgba(255,255,255,.16)",
                borderRadius: 12,
                padding: "12px 14px",
                background: item.done
                  ? "rgba(34,197,94,.12)"
                  : "rgba(245,158,11,.10)",
              }}
            >
              <span>{item.label}</span>
              <strong>{item.done ? "OK" : "Pendente"}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Avancar fase manualmente</h2>
        <label>Nova fase</label>
        <select
          value={novaFase}
          onChange={(e) => setNovaFase(e.target.value)}
          style={{
            minHeight: 48,
            padding: "12px 14px",
            fontSize: "1rem",
            fontWeight: 700,
          }}
        >
          {fases.map((fase) => (
            <option key={fase} value={fase}>
              {label(fase)}
            </option>
          ))}
        </select>

        <label>Observacao institucional</label>
        <textarea
          rows={4}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Descreva o motivo da mudanca de fase."
        />

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 14,
            padding: "12px 14px",
            border: "1px solid rgba(148, 163, 184, 0.38)",
            borderRadius: 12,
            background: "rgba(15, 23, 42, 0.45)",
            lineHeight: 1.45,
          }}
        >
          <input
            type="checkbox"
            checked={confirmado}
            style={{ width: 18, height: 18, flex: "0 0 auto" }}
            onChange={(e) => setConfirmado(e.target.checked)}
          />
          Confirmo que esta mudanca representa uma decisao humana e institucional.
        </label>

        {pendencias.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <strong>Pendencias/alertas:</strong>
            <ul>
              {pendencias.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <AdminLoadingButton
          type="button"
          className="admin-button"
          disabled={saving}
          loading={saving}
          loadingText="Processando..."
          onClick={avancarFase}
          style={{ marginTop: 16 }}
        >
          Salvar fase
        </AdminLoadingButton>

        {faseMsg && <p style={{ marginTop: 12, fontWeight: 700 }}>{faseMsg}</p>}
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Gerar, assinar e publicar</h2>
        <p>
          Gera o PDF oficial a partir do modelo. Você pode <strong>assinar
          agora no admin</strong> ou enviar o link por e-mail a um signatário.
          A publicação na página pública do edital ocorre somente após a
          assinatura.
        </p>

        <AssinarNoAdminModal
          open={oficialEmbedOpen}
          embedUrl={oficialEmbedUrl}
          signingUrl={oficialSigningUrl}
          title="Assinar documento oficial"
          onClose={() => setOficialEmbedOpen(false)}
          onCompleted={() => {
            setOficialMsg("Atualizando status da emissão…");
            carregarEmissoesOficiais();
          }}
        />

        <label>Tipo de documento</label>
        <select
          value={tipoEmissaoOficial}
          onChange={(e) => setTipoEmissaoOficial(e.target.value)}
        >
          {modelosOficiais.length === 0 ? (
            <option value="">Nenhum modelo disponível</option>
          ) : (
            modelosOficiais.map((m) => (
              <option key={m.id} value={m.tipo_emissao}>
                {m.titulo}
              </option>
            ))
          )}
        </select>

        <label>Nome (opcional se você assinar agora)</label>
        <input
          value={signatarioNome}
          onChange={(e) => setSignatarioNome(e.target.value)}
          placeholder="Seu nome ou nome do signatário externo"
        />

        <label>E-mail do signatário (só para envio externo)</label>
        <input
          type="email"
          value={signatarioEmail}
          onChange={(e) => setSignatarioEmail(e.target.value)}
          placeholder="email@exemplo.com"
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <AdminLoadingButton
            type="button"
            className="admin-button"
            disabled={oficialSaving || !tipoEmissaoOficial}
            loading={oficialSaving}
            loadingText="Gerando..."
            onClick={() => gerarAssinarPublicar("eu_assino")}
          >
            Gerar e assinar agora
          </AdminLoadingButton>
          <AdminLoadingButton
            type="button"
            className="admin-button"
            disabled={oficialSaving || !tipoEmissaoOficial}
            loading={oficialSaving}
            loadingText="Enviando..."
            onClick={() => gerarAssinarPublicar("enviar_signatarios")}
          >
            Gerar e enviar a signatário
          </AdminLoadingButton>
        </div>

        {oficialMsg && (
          <p style={{ marginTop: 12, fontWeight: 700 }}>{oficialMsg}</p>
        )}

        <div style={{ marginTop: 20 }}>
          <strong>Emissões deste edital</strong>
          {emissoesOficiais.length === 0 ? (
            <p style={{ marginTop: 8 }}>Nenhuma emissão oficial ainda.</p>
          ) : (
            emissoesOficiais.map((em) => (
              <div
                key={em.id}
                style={{
                  borderTop: "1px solid rgba(255,255,255,.15)",
                  paddingTop: 12,
                  marginTop: 12,
                }}
              >
                <strong>{em.titulo}</strong>
                <p>
                  <strong>Status:</strong>{" "}
                  {LABEL_STATUS_EMISSAO[em.status] || em.status}
                  {em.publicado_em
                    ? ` · Publicado em ${new Date(
                        em.publicado_em
                      ).toLocaleString("pt-BR")}`
                    : ""}
                </p>
                {em.error_message ? (
                  <p style={{ color: "#fca5a5" }}>{em.error_message}</p>
                ) : null}
                <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {em.gd_document_id ? (
                    <Link
                      href={`/admin/documentos/documentos/${em.gd_document_id}`}
                    >
                      Abrir na Gestão Documental
                    </Link>
                  ) : null}
                  {em.status === "publicado" ? (
                    <Link href={`/editais/${editalId}`} target="_blank">
                      Ver página pública
                    </Link>
                  ) : null}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Publicar documento oficial</h2>
        <p>
          Cada fase pode receber documentos oficiais vinculados. Eles aparecem na
          Transparência com a fase correspondente
          {isCotacao
            ? " (ex.: ata de análise técnica na fase Análise)."
            : "."}
        </p>

        {sugestaoDocsFase ? (
          <div
            style={{
              marginTop: 12,
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(56,189,248,.35)",
              background: "rgba(14,165,233,.12)",
            }}
          >
            <strong>Sugestão para a fase atual ({label(faseAtual)})</strong>
            <p style={{ margin: "8px 0 0" }}>{sugestaoDocsFase.orientacao}</p>
            <p style={{ margin: "8px 0 0", fontSize: 13 }}>
              Tipos sugeridos:{" "}
              {sugestaoDocsFase.tipos
                .map((tipo) => labelTipoDocumento(tipo, true))
                .join(" · ")}
            </p>
          </div>
        ) : null}

        <label>Tipo do documento</label>
        <select value={docTipo} onChange={(e) => setDocTipo(e.target.value)}>
          {tiposDocumentoDisponiveis.map((tipo) => (
            <option key={tipo} value={tipo}>
              {labelTipoDocumento(tipo, isCotacao)}
            </option>
          ))}
        </select>

        <label>Fase relacionada</label>
        <select value={docFase} onChange={(e) => setDocFase(e.target.value)}>
          {fases.map((fase) => (
            <option key={fase} value={fase}>
              {label(fase)}
            </option>
          ))}
        </select>

        <label>Titulo do documento</label>
        <input value={docTitulo} onChange={(e) => setDocTitulo(e.target.value)} />

        <label>Descricao opcional</label>
        <textarea
          rows={3}
          value={docDescricao}
          onChange={(e) => setDocDescricao(e.target.value)}
        />

        <label>Arquivo PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setDocArquivo(e.target.files?.[0] ?? null)}
        />

        <AdminLoadingButton
          type="button"
          className="admin-button"
          disabled={saving}
          loading={saving}
          loadingText="Publicando..."
          onClick={publicarDocumento}
          style={{ marginTop: 16 }}
        >
          Publicar documento
        </AdminLoadingButton>

        {docMsg && <p style={{ marginTop: 12, fontWeight: 700 }}>{docMsg}</p>}
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Documentos oficiais</h2>
        <p>
          Documentos publicados aqui aparecem na pagina publica Transparencia,
          dentro de Editais e Chamamentos.
        </p>
        {documentosOrdenados.length === 0 ? (
          <p>Nenhum documento publicado neste edital.</p>
        ) : (
          documentosOrdenados.map((doc) => (
            <div key={doc.id} style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 12, marginTop: 12 }}>
              <strong>{doc.titulo}</strong>
              <p><strong>Tipo:</strong> {labelTipoDocumento(doc.tipo, isCotacao)} | <strong>Fase:</strong> {label(doc.fase)}</p>
              <p><strong>Publicado em:</strong> {formatDate(doc.publicado_em || doc.created_at)}</p>
              {doc.descricao && <p>{doc.descricao}</p>}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                <a href={downloadUrl(doc.arquivo_url)} target="_blank" rel="noreferrer">
                  Abrir documento
                </a>
                <button
                  type="button"
                  className="admin-button"
                  style={{ background: "#ef4444", color: "#fff" }}
                  disabled={saving}
                  onClick={() => excluirDocumento(doc)}
                >
                  Excluir documento
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Propostas vinculadas</h2>
        <p>
          Decisão por proposta (aprovar/rejeitar) e andamento do processo (fases/
          documentos) ficam juntos aqui para reduzir ida e volta de telas. O
          detalhe documental completo continua em{" "}
          <Link href="/admin/propostas">Propostas recebidas</Link>.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginTop: 16,
            marginBottom: 18,
          }}
        >
          {[
            { label: "Total", value: resumoPropostas.total, color: "#38bdf8" },
            { label: "Pendentes", value: resumoPropostas.pendentes, color: "#facc15" },
            { label: "Aprovadas", value: resumoPropostas.aprovadas, color: "#22c55e" },
            { label: "Rejeitadas", value: resumoPropostas.rejeitadas, color: "#ef4444" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: "1px solid rgba(255,255,255,.16)",
                borderRadius: 14,
                padding: 14,
                background: "rgba(15,23,42,.34)",
              }}
            >
              <span style={{ display: "block", color: "rgba(255,255,255,.72)" }}>
                {item.label}
              </span>
              <strong style={{ color: item.color, fontSize: 28 }}>{item.value}</strong>
            </div>
          ))}
          <div
            style={{
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 14,
              padding: 14,
              background: "rgba(15,23,42,.34)",
            }}
          >
            <span style={{ display: "block", color: "rgba(255,255,255,.72)" }}>
              Ultima proposta
            </span>
            <strong>{formatDate(resumoPropostas.ultimaData)}</strong>
          </div>
        </div>
        {propostas.length === 0 ? (
          <p>Nenhuma proposta vinculada a este edital.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 12,
            }}
          >
            {propostas.map((proposta) => {
              const status = proposta.status || "pendente";
              const statusColor =
                status === "aprovado"
                  ? "#22c55e"
                  : status === "rejeitado"
                  ? "#ef4444"
                  : "#facc15";

              return (
                <div
                  key={proposta.id}
                  style={{
                    border: "1px solid rgba(255,255,255,.16)",
                    borderRadius: 14,
                    padding: 14,
                    background: "rgba(15,23,42,.28)",
                  }}
                >
                  <strong>{proposta.nome || "Proposta"}</strong>
                  <p style={{ marginTop: 8, marginBottom: 0 }}>
                    {proposta.email || "-"}
                  </p>
                  <p style={{ marginTop: 6, marginBottom: 0 }}>
                    {proposta.telefone || "-"}
                  </p>
                  <p style={{ marginTop: 6, marginBottom: 0 }}>
                    <strong>Status:</strong>{" "}
                    <span style={{ color: statusColor, fontWeight: 700 }}>
                      {status}
                    </span>
                  </p>
                  <p style={{ marginTop: 6, marginBottom: 0 }}>
                    <strong>Enviada em:</strong>{" "}
                    {formatDate(proposta.criado_em || proposta.created_at)}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <Link
                      href={`/admin/propostas/${proposta.id}`}
                      className="admin-button"
                      style={{
                        display: "inline-flex",
                        textDecoration: "none",
                      }}
                    >
                      Ver proposta
                    </Link>
                    <button
                      type="button"
                      className="admin-button"
                      disabled={saving || status === "aprovado"}
                      style={{
                        background: "#22c55e",
                        color: "#022c22",
                        opacity: status === "aprovado" ? 0.55 : 1,
                      }}
                      onClick={() =>
                        atualizarStatusProposta(proposta.id, "aprovado")
                      }
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      className="admin-button"
                      disabled={saving || status === "rejeitado"}
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        opacity: status === "rejeitado" ? 0.55 : 1,
                      }}
                      onClick={() =>
                        atualizarStatusProposta(proposta.id, "rejeitado")
                      }
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Historico institucional</h2>
        {logs.length === 0 ? (
          <p>Nenhum log registrado para este edital.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 12, marginTop: 12 }}>
              <strong>{label(log.acao)}</strong>
              <p>{formatDate(log.created_at)} | {log.usuario_email || "admin"}</p>
              {(log.fase_anterior || log.fase_nova) && (
                <p>
                  {label(log.fase_anterior)} &rarr; {label(log.fase_nova)}
                </p>
              )}
              {log.observacao && <p>{log.observacao}</p>}
              <button
                type="button"
                className="admin-button"
                style={{ background: "#ef4444", color: "#fff", marginTop: 8 }}
                disabled={saving}
                onClick={() => excluirLog(log)}
              >
                Excluir registro
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
