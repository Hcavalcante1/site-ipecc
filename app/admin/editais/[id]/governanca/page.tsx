"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { confirmAction } from "@/components/AdminConfirmModal";
import { triggerToast } from "@/components/AdminToast";
import { AdminLoadingButton } from "@/components/admin";
import { adminStorageUpload } from "@/lib/admin/storageUploadClient";
import { supabase } from "@/lib/supabaseClient";

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

const FASES = [
  "rascunho",
  "publicado",
  "recebimento_propostas",
  "analise",
  "resultado_preliminar",
  "recurso",
  "julgamento_recurso",
  "resultado_final",
  "homologado",
  "adjudicado",
  "contratado",
  "execucao",
  "prestacao_contas",
  "encerrado",
];

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

function label(valor?: string | null) {
  if (!valor) return "-";
  return valor.replace(/_/g, " ");
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

  const faseAtual = edital?.fase_atual || "rascunho";

  const pendencias = useMemo(() => {
    const itens: string[] = [];
    if (!edital?.arquivo_pdf) itens.push("PDF oficial do edital ainda nao identificado.");
    if (!edital?.periodo && !edital?.periodo_envio) itens.push("Periodo do edital nao informado.");
    if (faseAtual === "resultado_preliminar") {
      const temResultado = documentos.some((doc) => doc.tipo === "resultado_preliminar");
      if (!temResultado) itens.push("Resultado preliminar ainda nao publicado.");
    }
    if (faseAtual === "homologado") {
      const temHomologacao = documentos.some((doc) => doc.tipo === "homologacao");
      if (!temHomologacao) itens.push("Documento de homologacao ainda nao publicado.");
    }
    if (faseAtual === "contratado") {
      const temContrato = documentos.some(
        (doc) => doc.tipo === "contrato" || doc.tipo === "termo_parceria"
      );
      if (!temContrato) itens.push("Contrato ou termo de parceria ainda nao publicado.");
    }
    return itens;
  }, [documentos, edital, faseAtual]);

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
      setNovaFase(json.edital?.fase_atual || "rascunho");
    } catch {
      setMsg("Erro inesperado ao carregar governanca.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (editalId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editalId]);

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

      const podeAvancar = await confirmAction(
        `Confirmar mudanca de fase para "${label(novaFase)}"? Esta acao sera registrada no historico institucional do edital.`
      );

      if (!podeAvancar) {
        setFaseMsg("Mudanca de fase cancelada.");
        return;
      }

      const faseAnterior = faseAtual;
      const { error } = await supabase
        .from("editais")
        .update({ fase_atual: novaFase })
        .eq("id", editalId);

      if (error) {
        setFaseMsg(`Erro ao atualizar fase: ${error.message}`);
        triggerToast("Erro ao atualizar fase.", "error");
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

      const { data, error } = await supabase
        .from("documentos_publicos")
        .insert({
          edital_id: editalId,
          tipo: docTipo,
          fase: docFase || null,
          titulo: docTitulo,
          descricao: docDescricao || null,
          arquivo_url: path,
          publicado: true,
        })
        .select("id")
        .single();

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
      await carregar();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ padding: 24 }}>Carregando governanca...</p>;

  if (!edital) {
    return (
      <div className="admin-box">
        <h1 className="admin-h1">Governanca do edital</h1>
        <p>{msg || "Edital nao encontrado."}</p>
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
        <p><strong>Status publico:</strong> {edital.status || "-"}</p>
        <p><strong>Periodo:</strong> {edital.periodo || edital.periodo_envio || "-"}</p>
        <p><strong>Fase atual:</strong> {label(faseAtual)}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <Link className="admin-button" href={`/editais/${edital.id}`} target="_blank">
            Ver edital publico
          </Link>
          <Link className="admin-button" href="/transparencia" target="_blank">
            Ver Transparencia
          </Link>
          <Link className="admin-button" href={`/admin/editais/${edital.id}`}>
            Editar cadastro
          </Link>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Avancar fase manualmente</h2>
        <label>Nova fase</label>
        <select value={novaFase} onChange={(e) => setNovaFase(e.target.value)}>
          {FASES.map((fase) => (
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

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
          <input
            type="checkbox"
            checked={confirmado}
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
        <h2 className="admin-h2">Publicar documento oficial</h2>

        <label>Tipo do documento</label>
        <select value={docTipo} onChange={(e) => setDocTipo(e.target.value)}>
          {TIPOS_DOCUMENTO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {label(tipo)}
            </option>
          ))}
        </select>

        <label>Fase relacionada</label>
        <select value={docFase} onChange={(e) => setDocFase(e.target.value)}>
          {FASES.map((fase) => (
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
        {documentos.length === 0 ? (
          <p>Nenhum documento publicado neste edital.</p>
        ) : (
          documentos.map((doc) => (
            <div key={doc.id} style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 12, marginTop: 12 }}>
              <strong>{doc.titulo}</strong>
              <p><strong>Tipo:</strong> {label(doc.tipo)} | <strong>Fase:</strong> {label(doc.fase)}</p>
              {doc.descricao && <p>{doc.descricao}</p>}
              <a href={downloadUrl(doc.arquivo_url)} target="_blank" rel="noreferrer">
                Abrir documento
              </a>
            </div>
          ))
        )}
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">Propostas vinculadas</h2>
        {propostas.length === 0 ? (
          <p>Nenhuma proposta vinculada a este edital.</p>
        ) : (
          propostas.map((proposta) => (
            <div key={proposta.id} style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 12, marginTop: 12 }}>
              <strong>{proposta.nome || "Proposta"}</strong>
              <p>{proposta.email || "-"} | {proposta.telefone || "-"}</p>
              <p><strong>Status:</strong> {proposta.status || "pendente"}</p>
              <Link href={`/admin/propostas/${proposta.id}`}>Ver detalhes</Link>
            </div>
          ))
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
            </div>
          ))
        )}
      </section>
    </div>
  );
}
