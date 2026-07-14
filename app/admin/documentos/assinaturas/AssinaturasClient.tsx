"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";
import AssinarNoAdminModal from "../components/AssinarNoAdminModal";
import AssinarAvancadaModal from "../components/AssinarAvancadaModal";
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
  error_message: string | null;
  external_session_id?: string | null;
  created_at: string;
};

export default function AssinaturasClient() {
  const search = useSearchParams();
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState("");
  const [documentoOk, setDocumentoOk] = useState(false);
  const [govbrOk, setGovbrOk] = useState(false);
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
  const autoStarted = useRef(false);

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
      setGovbrOk(Boolean(cfg.govbrConfigurado));
      setIpeccOk(Boolean(cfg.ipecc?.configurado ?? true));
      setProvedorPadrao(cfg.provedorPadrao || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const erro = search.get("erro");
    const ok = search.get("ok");
    const st = search.get("state");
    const sigId = search.get("signature_id");
    const docId = search.get("document_id");
    if (docId) setDocumentId(docId);
    if (erro) setAviso(erro);
    if (ok && st) {
      setState(st);
      setAviso(
        sigId
          ? "Autorização gov.br concluída. Clique em Assinar PKCS#7 no pedido correspondente."
          : "Autorização gov.br concluída."
      );
    }
  }, [search]);

  useEffect(() => {
    const docId = String(search.get("document_id") || "").trim();
    if (!docId) {
      setDocumentTitle(null);
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
  }, [search]);

  useEffect(() => {
    const docId = String(search.get("document_id") || "").trim();
    const sigId = String(search.get("signature_id") || "").trim();
    const auto = search.get("auto") === "1";
    if (!docId || autoStarted.current || loading) return;

    if (sigId) {
      autoStarted.current = true;
      setDocumentId(docId);
      abrirAssinatura({ signatureId: sigId, documentId: docId, providerCode: "ipecc" });
      return;
    }

    if (auto) {
      autoStarted.current = true;
      setDocumentId(docId);
      void (async () => {
        setAviso(
          documentTitle
            ? `Preparando assinatura de “${documentTitle}”…`
            : "Preparando assinatura…"
        );
        const res = await fetch("/api/admin/documentos/assinaturas", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: docId,
            provider_code: ipeccOk ? "ipecc" : documentoOk ? "documento" : undefined,
            modo: "eu_assino",
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setAviso(json.error || "Erro ao criar pedido.");
          autoStarted.current = false;
          return;
        }
        setAviso(
          documentTitle
            ? `Pronto para assinar: ${documentTitle}`
            : "Documento pronto. Continue no painel."
        );
        abrirAssinatura({
          signatureId: json.signature?.id || json.data?.id,
          documentId: docId,
          embedUrl: json.embedUrl,
          signingUrl: json.signingUrl,
          providerCode:
            json.signature?.provider_code || json.data?.provider_code,
        });
        carregar();
      })();
    }
  }, [
    search,
    loading,
    ipeccOk,
    documentoOk,
    documentTitle,
    carregar,
  ]);

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

  async function excluirPedido(id: string) {
    if (!confirm("Excluir este pedido de assinatura? O documento em si permanece."))
      return;
    const res = await fetch(`/api/admin/documentos/assinaturas?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao excluir pedido.");
      return;
    }
    setAviso("Pedido excluído.");
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

  async function autorizar(signatureId: string) {
    const res = await fetch("/api/admin/documentos/assinaturas/authorize", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature_document_id: signatureId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao iniciar OAuth gov.br.");
      return;
    }
    window.location.href = json.authorizationUrl;
  }

  async function assinar(signatureId: string) {
    if (!state) {
      setAviso("Autorize com gov.br antes de assinar (botão Autorizar).");
      return;
    }
    const res = await fetch(
      `/api/admin/documentos/assinaturas/${signatureId}/assinar`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      }
    );
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao assinar.");
      return;
    }
    setAviso("Documento assinado com sucesso (PKCS#7).");
    setState("");
    carregar();
  }

  return (
    <GestaoDocumentalShell
      title="Assinaturas"
      description="Documentos institucionais: assine você mesmo no admin (IPECC). Envio externo por e-mail é opcional. gov.br só para órgãos públicos."
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

      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b" }}>{aviso}</div>
      ) : null}

      <div style={gdCardStyle}>
        <p style={{ marginTop: 0 }}>
          Padrão:{" "}
          <strong>{provedorPadrao || "nenhum configurado"}</strong>
          {" · "}
          IPECC: <strong>{ipeccOk ? "pronta" : "indisponível"}</strong>
          {" · "}
          Legado Documento:{" "}
          <strong>{documentoOk ? "pronta" : "não configurada"}</strong>
          {" · "}
          gov.br: <strong>{govbrOk ? "pronto" : "ausente"}</strong>
        </p>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.85 }}>
          Preferência: abra o documento e clique em <strong>Assinar no admin</strong> —
          o ID entra sozinho. Não precisa copiar da barra de endereço.
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
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {!documentTitle ? (
            <input
              style={gdInputStyle}
              placeholder="ID do documento (ou use Assinar na ficha)"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
            />
          ) : (
            <input type="hidden" value={documentId} readOnly />
          )}
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
                {row.status !== "signed" ? (
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
                          : "Enviar a outra pessoa"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        style={gdBtnStyle}
                        onClick={() => autorizar(row.id)}
                      >
                        Autorizar gov.br
                      </button>
                      <button
                        type="button"
                        style={{ ...gdBtnStyle, background: "#0f766e" }}
                        onClick={() => assinar(row.id)}
                      >
                        Assinar PKCS#7
                      </button>
                    </>
                  )
                ) : (
                  <span style={{ fontSize: 13, color: "#86efac" }}>
                    Assinado
                  </span>
                )}
                <button
                  type="button"
                  style={{ ...gdBtnStyle, background: "#7f1d1d" }}
                  onClick={() => excluirPedido(row.id)}
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
