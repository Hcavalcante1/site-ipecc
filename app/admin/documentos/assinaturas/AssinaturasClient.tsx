"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";
import AssinarNoAdminModal from "../components/AssinarNoAdminModal";
import AssinarAvancadaModal from "../components/AssinarAvancadaModal";
import AssinarComCertificadoModal from "../components/AssinarComCertificadoModal";
import { useAdminEscopoCliente } from "@/lib/auth/useAdminEscopoCliente";
import { carregarProcessosDoEscopo } from "@/lib/auth/processosEscopoCliente";
import {
  rotuloProviderAssinatura,
  rotuloStatusAssinatura,
} from "@/lib/documentos/labels";

type SignatureRow = {
  id: string;
  document_id: string;
  document_title?: string | null;
  status: string;
  provider_code: string;
  signed_storage_path: string | null;
  signer_name?: string | null;
  verification_code?: string | null;
  kind?: "certificate" | string | null;
  error_message: string | null;
  external_session_id?: string | null;
  created_at: string;
};

type ProcessoOpcao = {
  id: string;
  titulo: string;
};

type DocumentoImportado = {
  id: string;
  fileName: string;
  title: string;
  processoId: string | null;
};

type CertificateTargetSource = "importado" | "existente" | "linha" | null;

function baseName(fileName: string): string {
  const trimmed = fileName.trim();
  const withoutExt = trimmed.replace(/\.[^.]+$/, "");
  return withoutExt || "Documento";
}

export default function AssinaturasClient() {
  const search = useSearchParams();
  const escopo = useAdminEscopoCliente();
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [processos, setProcessos] = useState<ProcessoOpcao[]>([]);
  const [processoId, setProcessoId] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [documentosImportados, setDocumentosImportados] = useState<
    DocumentoImportado[]
  >([]);
  const [importandoArquivos, setImportandoArquivos] = useState(false);
  const [documentId, setDocumentId] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [documentoOk, setDocumentoOk] = useState(false);
  const [provedorPadrao, setProvedorPadrao] = useState<string | null>(null);
  const [embedSignatureId, setEmbedSignatureId] = useState<string | null>(null);
  const [embedDocumentId, setEmbedDocumentId] = useState<string | null>(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [ipeccOk, setIpeccOk] = useState(true);
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const [advOpen, setAdvOpen] = useState(false);
  const [advDocumentId, setAdvDocumentId] = useState<string | null>(null);
  const [advDocumentTitle, setAdvDocumentTitle] = useState<string | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [certDocumentIds, setCertDocumentIds] = useState<string[] | null>(null);
  const [certificateTargetSource, setCertificateTargetSource] =
    useState<CertificateTargetSource>(null);
  const autoSimpleKey = useRef<string | null>(null);
  const processoSelecionado = useMemo(() => {
    if (processoId) return processoId;
    return processos[0]?.id || "";
  }, [processoId, processos]);
  const documentIdsCertificado = useMemo(() => {
    if (certDocumentIds && certDocumentIds.length > 0) {
      return certDocumentIds;
    }
    if (
      certificateTargetSource === "importado" &&
      documentosImportados.length > 0
    ) {
      return documentosImportados.map((item) => item.id);
    }
    return documentId.trim() ? [documentId.trim()] : [];
  }, [
    certDocumentIds,
    certificateTargetSource,
    documentId,
    documentosImportados,
  ]);

  const abrirCertificado = useCallback(
    (documentIds: string[], source: CertificateTargetSource = null) => {
      const ids = documentIds.map((id) => String(id).trim()).filter(Boolean);
      if (!ids.length) {
        setAviso(
          "Informe ou selecione um documento para assinar com certificado."
        );
        return;
      }
      setCertificateTargetSource(source);
      setCertDocumentIds(ids);
      setCertOpen(true);
    },
    []
  );
  const carregar = useCallback(async () => {
    setLoading(true);
    const [sigRes, cfgRes] = await Promise.all([
      fetch("/api/admin/documentos/assinaturas", { credentials: "include" }),
      fetch("/api/admin/documentos/configuracoes", { credentials: "include" }),
    ]);
    const sig = await sigRes.json();
    const cfg = await cfgRes.json();
    if (sigRes.ok) {
      setRows(sig.signatures || []);
      setAviso(sig.aviso || "");
    } else {
      setAviso(sig.error || "Erro ao carregar assinaturas.");
    }
    if (cfgRes.ok) {
      setDocumentoOk(Boolean(cfg.documento?.configurado));
      setIpeccOk(Boolean(cfg.ipecc?.configurado ?? true));
      setProvedorPadrao(cfg.provedorPadrao || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    let ativo = true;
    async function carregarProcessos() {
      if (escopo.loading) return;
      const lista = await carregarProcessosDoEscopo(escopo.processoIds);
      if (!ativo) return;
      setProcessos(lista);
      setProcessoId((current) => current || lista[0]?.id || "");
    }
    void carregarProcessos();
    return () => {
      ativo = false;
    };
  }, [escopo.loading, escopo.processoIds]);

  useEffect(() => {
    const erro = search.get("erro");
    const docId = search.get("document_id");
    if (docId) setDocumentId(docId);
    if (erro) setAviso(erro);
  }, [search]);

  useEffect(() => {
    const docId = documentId.trim();
    if (!docId) {
      setDocumentTitle(null);
      return;
    }
    const local = documentosImportados.find((doc) => doc.id === docId);
    if (local) {
      setDocumentTitle(local.title);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/documentos/${docId}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.document?.title) {
          setDocumentTitle(String(json.document.title));
        } else {
          setDocumentTitle(null);
        }
      } catch {
        if (!cancelled) setDocumentTitle(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, documentosImportados]);

  useEffect(() => {
    const docId = String(search.get("document_id") || "").trim();
    if (!docId) return;
    setDocumentId(docId);
  }, [search]);

  useEffect(() => {
    const docId = documentId.trim();
    if (search.get("simple") !== "1" || !docId) return;
    const chave = `simple:${docId}`;
    if (autoSimpleKey.current === chave) return;
    autoSimpleKey.current = chave;
    void criarEAssinarAgora();
  }, [abrirCertificado, documentId, search]);

  useEffect(() => {
    if (search.get("cert") === "1" && documentId.trim()) {
      abrirCertificado([documentId.trim()]);
    }
  }, [documentId, search]);

  useEffect(() => {
    if (search.get("adv") === "1" && documentId.trim()) {
      setAdvDocumentId(documentId.trim());
      setAdvDocumentTitle(documentTitle);
      setAdvOpen(true);
    }
  }, [documentId, documentTitle, search]);

  function atualizarArquivosSelecionados(files: FileList | null) {
    const lista = Array.from(files || []).filter(
      (file) => file.type === "application/pdf" || /\.pdf$/i.test(file.name)
    );
    setArquivos(lista);
    setDocumentosImportados([]);
    if (!lista.length) {
      setAviso("");
      return;
    }
    setAviso(
      `${lista.length} PDF(s) selecionado(s). O sistema vai criar os documentos e gerar os IDs automaticamente.`
    );
  }

  async function importarArquivosComoDocumentos() {
    if (!arquivos.length) {
      setAviso("Escolha ao menos um PDF para gerar os documentos.");
      return;
    }

    const pid =
      processoSelecionado || (escopo.mestre ? processos[0]?.id || "" : "");
    if (!pid) {
      setAviso(
        "Não encontrei um processo ativo no seu escopo. Escolha um processo antes de importar os PDFs."
      );
      return;
    }

    setImportandoArquivos(true);
    setAviso("");
    const importados: DocumentoImportado[] = [];

    try {
      for (let i = 0; i < arquivos.length; i++) {
        const file = arquivos[i];
        const titulo = `${baseName(file.name)}${arquivos.length > 1 ? ` ${i + 1}` : ""}`.trim();

        const createRes = await fetch("/api/admin/documentos", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titulo,
            description: `Arquivo importado para assinatura: ${file.name}`,
            processo_id: pid,
            status: "draft",
          }),
        });
        const createJson = (await createRes.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          document?: { id: string };
        };
        if (!createRes.ok || !createJson.ok || !createJson.document?.id) {
          throw new Error(
            createJson.error || `Falha ao criar documento para ${file.name}.`
          );
        }

        const form = new FormData();
        form.append("file", file, file.name);
        form.append("file_name", file.name);
        form.append("change_note", "Upload inicial para assinatura");

        const uploadRes = await fetch(
          `/api/admin/documentos/${encodeURIComponent(createJson.document.id)}/upload`,
          {
            method: "POST",
            credentials: "include",
            body: form,
          }
        );
        const uploadJson = (await uploadRes.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (!uploadRes.ok || !uploadJson.ok) {
          throw new Error(
            uploadJson.error || `Falha ao enviar o arquivo ${file.name}.`
          );
        }

        importados.push({
          id: createJson.document.id,
          fileName: file.name,
          title: titulo,
          processoId: pid,
        });
      }

      setDocumentosImportados(importados);
      setDocumentId(importados[0]?.id || "");
      setDocumentTitle(importados[0]?.title || null);
      setCertificateTargetSource("importado");
      setAviso(
        `${importados.length} documento(s) criados com sucesso. Agora escolha o tipo de assinatura.`
      );
      carregar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Erro ao importar PDFs.");
    } finally {
      setImportandoArquivos(false);
    }
  }

  function abrirAssinatura(opts: {
    signatureId?: string | null;
    documentId?: string | null;
    embedUrl?: string | null;
    signingUrl?: string | null;
    providerCode?: string | null;
  }) {
    const isIpecc =
      opts.providerCode === "ipecc" ||
      (!opts.embedUrl && !opts.signingUrl && Boolean(opts.signatureId));

    const docId =
      opts.documentId ||
      documentId.trim() ||
      (opts.signatureId
        ? rows.find((r) => r.id === opts.signatureId)?.document_id
        : null) ||
      null;

    if (isIpecc && opts.signatureId) {
      setEmbedSignatureId(opts.signatureId);
      setEmbedDocumentId(docId);
      setEmbedUrl(null);
      setSigningUrl(null);
      setEmbedOpen(true);
      return;
    }

    const embed = opts.embedUrl || null;
    const sign = opts.signingUrl || null;
    if (!embed && !sign) {
      setAviso(
        "Pedido criado, mas o link de assinatura não veio do motor. Use Assinar agora ou verifique a configuração."
      );
      return;
    }
    setEmbedSignatureId(null);
    setEmbedDocumentId(docId);
    setEmbedUrl(embed);
    setSigningUrl(sign);
    setEmbedOpen(true);
  }

  async function criarEAssinarAgora() {
    if (!documentId.trim()) {
      setAviso("Selecione um documento (use Assinar no admin na ficha do documento).");
      return;
    }
    const res = await fetch("/api/admin/documentos/assinaturas", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: documentId.trim(),
        provider_code: ipeccOk ? "ipecc" : documentoOk ? "documento" : undefined,
        modo: "eu_assino",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao criar pedido.");
      return;
    }
    setAviso(
      documentTitle
        ? `Pronto para assinar: ${documentTitle}`
        : "Documento pronto. Continue no painel."
    );
    abrirAssinatura({
      signatureId: json.signature?.id || json.data?.id,
      documentId: documentId.trim(),
      embedUrl: json.embedUrl,
      signingUrl: json.signingUrl,
      providerCode: json.signature?.provider_code || json.data?.provider_code,
    });
    carregar();
  }

  async function moverDocumentoParaLixeira() {
    const docId = documentId.trim();
    if (!docId) {
      setAviso("Selecione um documento antes de mover para a lixeira.");
      return;
    }
    if (!confirm("Mover este documento para a lixeira?")) return;
    const res = await fetch(`/api/admin/documentos/${docId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao mover documento para a lixeira.");
      return;
    }
    setAviso("Documento movido para a lixeira.");
    setDocumentId("");
    setDocumentTitle(null);
    carregar();
  }

  async function criarEEnviarSignatario() {
    if (!documentId.trim()) {
      setAviso("Informe o ID do documento.");
      return;
    }
    if (!signerEmail.trim()) {
      setAviso("Informe o e-mail do signatário para envio externo.");
      return;
    }
    const res = await fetch("/api/admin/documentos/assinaturas", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: documentId.trim(),
        provider_code: documentoOk ? "documento" : undefined,
        signer_email: signerEmail.trim(),
        signer_name: signerName.trim() || undefined,
        modo: "enviar_signatarios",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao criar pedido.");
      return;
    }
    setDocumentId("");
    setAviso("Pedido criado e enviado por e-mail ao signatário.");
    carregar();
  }

  async function enviarDocumento(signatureId: string) {
    if (!signerEmail.trim()) {
      setAviso("Informe o e-mail do signatário acima antes de enviar.");
      return;
    }
    const res = await fetch(
      `/api/admin/documentos/assinaturas/${signatureId}/enviar`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_email: signerEmail.trim(),
          signer_name: signerName.trim() || undefined,
          modo: "enviar_signatarios",
        }),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao enviar para assinatura.");
      return;
    }
    setAviso("Envelope enviado ao signatário.");
    carregar();
  }

  async function excluirPedido(id: string, kind?: string | null) {
    if (
      !confirm(
        "Excluir este registro de assinatura do histórico? O documento original permanece."
      )
    )
      return;
    const qs = new URLSearchParams({ id });
    if (kind === "certificate" || kind === "certificado") {
      qs.set("kind", "certificate");
    }
    const res = await fetch(`/api/admin/documentos/assinaturas?${qs}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao excluir pedido.");
      return;
    }
    setAviso("Registro excluído do histórico.");
    carregar();
  }

  async function assinarAgoraPedido(signatureId: string) {
    const row = rows.find((r) => r.id === signatureId);
    if (row?.external_session_id) {
      const linkRes = await fetch(
        `/api/admin/documentos/assinaturas/${signatureId}/link`,
        { credentials: "include" }
      );
      const linkJson = await linkRes.json();
      if (!linkRes.ok) {
        setAviso(linkJson.error || "Não foi possível obter o link.");
        return;
      }
      if (linkJson.signed) {
        setAviso("Este pedido já está assinado.");
        carregar();
        return;
      }
      abrirAssinatura({
        signatureId,
        documentId: row.document_id,
        embedUrl: linkJson.embedUrl,
        signingUrl: linkJson.signingUrl,
        providerCode: row.provider_code,
      });
      return;
    }

    const res = await fetch(
      `/api/admin/documentos/assinaturas/${signatureId}/enviar`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: "eu_assino" }),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao preparar assinatura no admin.");
      return;
    }
    setAviso("Assine no painel.");
    abrirAssinatura({
      signatureId,
      documentId: row?.document_id,
      embedUrl: json.embedUrl,
      signingUrl: json.signingUrl,
      providerCode: row?.provider_code || "documento",
    });
    carregar();
  }

  return (
    <GestaoDocumentalShell
      title="Assinaturas"
      description="Documentos institucionais: assine você mesmo no admin (IPECC). Envio externo por e-mail é opcional."
    >
      <AssinarNoAdminModal
        open={embedOpen}
        signatureDocumentId={embedSignatureId}
        documentId={embedDocumentId}
        embedUrl={embedUrl}
        signingUrl={signingUrl}
        onClose={() => {
          setEmbedOpen(false);
          setEmbedSignatureId(null);
          setEmbedDocumentId(null);
        }}
        onCompleted={() => {
          setAviso("Atualizando status da assinatura…");
          carregar();
        }}
      />
      <AssinarAvancadaModal
        open={advOpen}
        documentId={advDocumentId}
        documentTitle={advDocumentTitle}
        onClose={() => {
          setAdvOpen(false);
          setAdvDocumentId(null);
          setAdvDocumentTitle(null);
        }}
      />
      <AssinarComCertificadoModal
        open={certOpen}
        documentIds={documentIdsCertificado}
        onClose={() => {
          setCertOpen(false);
          setCertDocumentIds(null);
        }}
        onCompleted={() => {
          setAviso("Assinatura com certificado registrada.");
          carregar();
        }}
      />

      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b" }}>{aviso}</div>
      ) : null}

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Fluxo guiado de assinatura
        </h2>
        <p style={{ marginTop: 0, fontSize: 14, opacity: 0.9 }}>
          Envie um ou mais PDFs, o sistema cria os documentos automaticamente e
          só depois libera as assinaturas. O ID fica interno e não precisa ser
          copiado da barra de endereço.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          {processos.length > 1 ? (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13 }}>Processo do documento</span>
              <select
                style={gdInputStyle}
                value={processoId}
                onChange={(e) => setProcessoId(e.target.value)}
              >
                {processos.map((processo) => (
                  <option key={processo.id} value={processo.id}>
                    {processo.titulo}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label
            style={{
              display: "grid",
              gap: 8,
              padding: 14,
              borderRadius: 12,
              border: "1px dashed #64748b",
              background: "rgba(15,23,42,0.45)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Upload de PDFs para gerar os documentos
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(e) => atualizarArquivosSelecionados(e.target.files)}
              style={{ color: "#cbd5e1" }}
            />
            <small style={{ color: "#94a3b8" }}>
              Cada arquivo vira um documento pronto para assinatura.
            </small>
          </label>
          {arquivos.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              <strong>Arquivos selecionados</strong>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#cbd5e1" }}>
                {arquivos.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={{ ...gdBtnStyle, background: "#0f766e" }}
                disabled={importandoArquivos || arquivos.length === 0}
                onClick={() => void importarArquivosComoDocumentos()}
              >
                {importandoArquivos
                  ? "Gerando documentos…"
                : "Criar documentos automaticamente"}
              </button>
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#334155" }}
              onClick={() => {
                setArquivos([]);
                setDocumentosImportados([]);
                setDocumentId("");
                setDocumentTitle(null);
              }}
              disabled={importandoArquivos && arquivos.length === 0}
            >
              Remover PDFs
            </button>
          </div>
          {documentosImportados.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              <strong>Documentos gerados</strong>
              <div style={{ display: "grid", gap: 8 }}>
                {documentosImportados.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background:
                        doc.id === documentId.trim()
                          ? "rgba(14,165,233,0.18)"
                          : "rgba(15,23,42,0.35)",
                      border:
                        doc.id === documentId.trim()
                          ? "1px solid #38bdf8"
                          : "1px solid #334155",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{doc.title}</div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>
                        {doc.fileName}
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        ...gdBtnStyle,
                        background:
                          doc.id === documentId.trim() ? "#0f766e" : "#1d4ed8",
                      }}
                      onClick={() => {
                        setDocumentId(doc.id);
                        setDocumentTitle(doc.title);
                      }}
                    >
                      Selecionar para assinar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={gdCardStyle}>
        <p style={{ marginTop: 0 }}>
          Padrão:{" "}
          <strong>{provedorPadrao || "nenhum configurado"}</strong>
          {" · "}
          IPECC: <strong>{ipeccOk ? "pronta" : "indisponível"}</strong>
          {" · "}
          Legado Documento:{" "}
          <strong>{documentoOk ? "pronta" : "não configurada"}</strong>
        </p>
          <p style={{ marginTop: 0, fontSize: 13, opacity: 0.85 }}>
          Preferência: envie um PDF acima e escolha o tipo de assinatura. O
          documento gerado já chega com o identificador interno preenchido
          sozinho.
        </p>
        {documentTitle && documentId ? (
          <p
            style={{
              marginTop: 0,
              marginBottom: 10,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(15,118,110,0.18)",
              border: "1px solid #0f766e",
              fontSize: 14,
            }}
          >
            Documento selecionado: <strong>{documentTitle}</strong>
            {" · "}
            <Link href={`/admin/documentos/documentos/${documentId}`}>
              abrir ficha
            </Link>
          </p>
        ) : null}
        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, opacity: 0.9 }}>
            Usar documento já existente
          </summary>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <input
              style={gdInputStyle}
              placeholder="Identificador interno do documento"
              value={documentId}
              onChange={(e) => {
                setDocumentId(e.target.value);
                setCertificateTargetSource("existente");
              }}
            />
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              Se você já abriu a ficha do documento, o ID continua entrando
              sozinho.
            </span>
          </div>
        </details>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            style={gdInputStyle}
            placeholder="Seu nome (quem assina no admin)"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
          />
          <input
            style={gdInputStyle}
            placeholder="E-mail (só se for envio externo)"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
          />
          <button
            type="button"
            style={{ ...gdBtnStyle, background: "#0f766e" }}
            onClick={criarEAssinarAgora}
          >
            Assinar no admin
          </button>
          <button
            type="button"
            style={{ ...gdBtnStyle, background: "#1d4ed8" }}
            disabled={!documentId.trim()}
            onClick={() => {
              const id = documentId.trim();
              if (!id) {
                setAviso("Informe ou selecione um documento para a assinatura avançada.");
                return;
              }
              setAdvDocumentId(id);
              setAdvDocumentTitle(documentTitle);
              setAdvOpen(true);
            }}
          >
            Assinatura avançada
          </button>
              <button
                type="button"
                style={{ ...gdBtnStyle, background: "#7c3aed" }}
                disabled={documentIdsCertificado.length < 1}
                onClick={() => {
                  if (documentIdsCertificado.length < 1) {
                    abrirCertificado([]);
                    return;
                  }
                  abrirCertificado(
                    documentIdsCertificado,
                    certificateTargetSource
                  );
                }}
              >
                Assinar com certificado
          </button>
          <button
            type="button"
            style={{ ...gdBtnStyle, background: "#ef4444" }}
            disabled={!documentId.trim()}
            onClick={moverDocumentoParaLixeira}
          >
            Lixeira
          </button>
          <button type="button" style={gdBtnStyle} onClick={criarEEnviarSignatario}>
            Enviar a outra pessoa
          </button>
          {documentTitle ? (
            <button
              type="button"
              style={{ ...gdBtnStyle, background: "#334155" }}
              onClick={() => {
                setDocumentId("");
                setDocumentTitle(null);
                setDocumentosImportados([]);
                setCertDocumentIds(null);
                setCertificateTargetSource(null);
              }}
            >
              Trocar documento
            </button>
          ) : null}
        </div>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Pedidos
        </h2>
        {loading ? <p>Carregando...</p> : null}
        {!loading && rows.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Nenhum pedido de assinatura.</p>
        ) : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {rows.map((row) => (
            <li
              key={row.id}
              style={{
                borderTop: "1px solid #334155",
                padding: "12px 0",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div>
                  <strong>
                    {row.document_title?.trim() || "Documento sem título"}
                  </strong>
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                  {rotuloStatusAssinatura(row.status)}
                  {" · "}
                  {rotuloProviderAssinatura(row.provider_code)}
                  {" · "}
                  {new Date(row.created_at).toLocaleString("pt-BR")}
                </div>
                {row.signer_name ? (
                  <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                    Assinado por: <strong>{row.signer_name}</strong>
                  </div>
                ) : null}
                {row.error_message ? (
                  <div style={{ color: "#fca5a5", fontSize: 13 }}>
                    {row.error_message}
                  </div>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link
                  href={`/admin/documentos/documentos/${row.document_id}`}
                  style={{
                    ...gdBtnStyle,
                    background: "#334155",
                    textDecoration: "none",
                  }}
                >
                  Abrir documento
                </Link>
                {row.status === "signed" &&
                (row.verification_code ||
                  row.provider_code === "certificado" ||
                  row.signed_storage_path) ? (
                  <>
                    {row.verification_code ? (
                      <a
                        href={`/api/download/assinatura/${row.verification_code}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...gdBtnStyle,
                          background: "#0f766e",
                          textDecoration: "none",
                        }}
                      >
                        Baixar PDF assinado
                      </a>
                    ) : row.provider_code === "certificado" ? (
                      <a
                        href={`/api/admin/documentos/assinaturas-certificado/${row.id}/arquivo?tipo=assinado`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...gdBtnStyle,
                          background: "#0f766e",
                          textDecoration: "none",
                        }}
                      >
                        Baixar PDF assinado
                      </a>
                    ) : null}
                    {row.verification_code ? (
                      <a
                        href={`/validar/${row.verification_code}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...gdBtnStyle,
                          background: "#1e3a5f",
                          textDecoration: "none",
                        }}
                      >
                        Validar
                      </a>
                    ) : null}
                    <span style={{ fontSize: 13, color: "#86efac" }}>
                      Assinado
                    </span>
                  </>
                ) : row.status !== "signed" ? (
                  row.provider_code === "ipecc" ? (
                    <>
                      <button
                        type="button"
                        style={{ ...gdBtnStyle, background: "#0f766e" }}
                        onClick={() =>
                          abrirAssinatura({
                            signatureId: row.id,
                            documentId: row.document_id,
                            providerCode: "ipecc",
                          })
                        }
                      >
                        Assinar agora (simples)
                      </button>
                      <button
                        type="button"
                        style={{ ...gdBtnStyle, background: "#1d4ed8" }}
                        onClick={() => {
                          setAdvDocumentId(row.document_id);
                          setAdvDocumentTitle(
                            row.document_title || documentTitle
                          );
                          setAdvOpen(true);
                        }}
                      >
                        Assinatura avançada
                      </button>
                    </>
                  ) : row.provider_code === "documento" ||
                    row.provider_code === "documenso" ? (
                    <>
                      <button
                        type="button"
                        style={{ ...gdBtnStyle, background: "#0f766e" }}
                        onClick={() => assinarAgoraPedido(row.id)}
                      >
                        Assinar agora
                      </button>
                  <button
                    type="button"
                    style={gdBtnStyle}
                    onClick={() => enviarDocumento(row.id)}
                    disabled={Boolean(row.external_session_id)}
                      >
                        {row.external_session_id
                          ? "Já enviado"
                          : "Envio externo"}
                      </button>
                    </>
                  ) : row.provider_code === "certificado" ||
                    row.kind === "certificate" ? (
                    <button
                      type="button"
                      style={{ ...gdBtnStyle, background: "#7c3aed" }}
                      onClick={() => {
                        setDocumentId(row.document_id);
                        setDocumentTitle(row.document_title || null);
                        abrirCertificado([row.document_id], "linha");
                      }}
                    >
                      Assinar com certificado
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: "#cbd5e1" }}>
                      Sem ação automática para este provedor
                    </span>
                  )
                ) : (
                  <span style={{ fontSize: 13, color: "#86efac" }}>
                    Assinado
                  </span>
                )}
                <button
                  type="button"
                  style={{ ...gdBtnStyle, background: "#7f1d1d" }}
                  onClick={() =>
                    excluirPedido(
                      row.id,
                      row.provider_code === "certificado" ||
                        row.kind === "certificate"
                        ? "certificate"
                        : null
                    )
                  }
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </GestaoDocumentalShell>
  );
}
