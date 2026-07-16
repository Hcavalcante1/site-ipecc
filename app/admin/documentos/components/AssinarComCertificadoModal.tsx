"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CERT_DISCLAIMER } from "@/lib/documentos/assinaturas/certificate/constants";
import type { LoadedCertificate } from "@/lib/documentos/assinaturas/certificate/clientCertSign";

type Props = {
  open: boolean;
  onClose: () => void;
  documentIds: string[];
  onCompleted?: () => void;
};

type SessionItem = {
  itemId: string | null;
  transactionId: string;
  documentId: string;
  documentHashSha256: string;
  downloadPath: string;
};

type Step = "cert" | "pages" | "signing" | "done";

export default function AssinarComCertificadoModal({
  open,
  onClose,
  documentIds,
  onCompleted,
}: Props) {
  const [step, setStep] = useState<Step>("cert");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [pfxPassword, setPfxPassword] = useState("");
  const [certLabel, setCertLabel] = useState<string | null>(null);
  const [pageByDoc, setPageByDoc] = useState<Record<string, number>>({});
  const [defaultPage, setDefaultPage] = useState(1);
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<
    Array<{ documentId: string; ok: boolean; code?: string; error?: string }>
  >([]);
  const certRef = useRef<LoadedCertificate | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("cert");
    setErro(null);
    setPfxFile(null);
    setPfxPassword("");
    setCertLabel(null);
    setPageByDoc({});
    setDefaultPage(1);
    setSessionItems([]);
    setBatchId(null);
    setProgress("");
    setResults([]);
    certRef.current = null;
  }, [open, documentIds]);

  if (!open) return null;

  const field: CSSProperties = {
    display: "block",
    width: "100%",
    marginTop: 4,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #475569",
    background: "#1e293b",
    color: "#f8fafc",
  };

  async function carregarCertificado() {
    if (!pfxFile) {
      setErro("Selecione o arquivo .pfx ou .p12 do computador.");
      return;
    }
    setBusy(true);
    setErro(null);
    try {
      const { loadPfxFromFile } = await import(
        "@/lib/documentos/assinaturas/certificate/clientCertSign"
      );
      const loaded = await loadPfxFromFile(pfxFile, pfxPassword);
      certRef.current = loaded;
      setCertLabel(
        `${loaded.subject} · válido até ${new Date(loaded.notAfter).toLocaleDateString("pt-BR")}`
      );
      setStep("pages");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ler o certificado.");
    } finally {
      setBusy(false);
    }
  }

  async function iniciarEAssinar() {
    const cert = certRef.current;
    if (!cert?.privateKeyPem) {
      setErro("Certificado não carregado. Importe o .pfx novamente.");
      setStep("cert");
      return;
    }
    if (documentIds.length < 1) {
      setErro("Nenhum documento selecionado.");
      return;
    }

    setBusy(true);
    setErro(null);
    setStep("signing");
    setProgress("Criando sessão…");
    setResults([]);

    try {
      const createRes = await fetch(
        "/api/admin/documentos/assinaturas-certificado",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentIds }),
        }
      );
      const createJson = await createRes.json();
      if (!createRes.ok || !createJson.ok) {
        setErro(createJson.error || "Falha ao criar sessão.");
        setStep("pages");
        return;
      }

      const items = (createJson.items || []) as SessionItem[];
      setSessionItems(items);
      setBatchId(createJson.batchId || null);

      const {
        signPdfWithLocalCertificate,
        discardCertificate,
      } = await import(
        "@/lib/documentos/assinaturas/certificate/clientCertSign"
      );

      const out: Array<{
        documentId: string;
        ok: boolean;
        code?: string;
        error?: string;
      }> = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setProgress(
          `Assinando ${i + 1}/${items.length}: ${item.documentId.slice(0, 8)}…`
        );
        try {
          const dl = await fetch(item.downloadPath, { credentials: "include" });
          if (!dl.ok) {
            throw new Error("Falha ao baixar o PDF original.");
          }
          const pdfBytes = new Uint8Array(await dl.arrayBuffer());
          const page =
            pageByDoc[item.documentId] ||
            defaultPage ||
            1;

          const signed = await signPdfWithLocalCertificate({
            pdfBytes,
            expectedHashSha256: item.documentHashSha256,
            cert,
            appearance: {
              page,
              signerLabel: cert.subject,
            },
          });

          const concl = await fetch(
            `/api/admin/documentos/assinaturas-certificado/${item.transactionId}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "concluir",
                transactionId: item.transactionId,
                signedPdfBase64: signed.signedPdfBase64,
                pkcs7Base64: signed.pkcs7Base64,
                cert: {
                  subject: cert.subject,
                  issuer: cert.issuer,
                  serial: cert.serial,
                  notBefore: cert.notBefore,
                  notAfter: cert.notAfter,
                  thumbprintSha256: cert.thumbprintSha256,
                },
                appearance: { page },
              }),
            }
          );
          const conclJson = await concl.json();
          if (!concl.ok || !conclJson.ok) {
            throw new Error(conclJson.error || "Falha ao gravar assinatura.");
          }
          out.push({
            documentId: item.documentId,
            ok: true,
            code: conclJson.validationCode,
          });
        } catch (e) {
          out.push({
            documentId: item.documentId,
            ok: false,
            error: e instanceof Error ? e.message : "Erro ao assinar.",
          });
        }
      }

      if (createJson.batchId) {
        await fetch(
          `/api/admin/documentos/assinaturas-certificado/${createJson.batchId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "finalizar" }),
          }
        );
      }

      discardCertificate(cert);
      certRef.current = null;
      setResults(out);
      setStep("done");
      setProgress("");
      onCompleted?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
      setStep("pages");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.72)",
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(640px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 12,
          color: "#e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #334155",
          }}
        >
          <strong>Assinar com certificado digital</strong>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#334155",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.45 }}>
            {CERT_DISCLAIMER}
          </p>
          <p style={{ fontSize: 13 }}>
            Documentos: <strong>{documentIds.length}</strong>
          </p>
          {erro ? (
            <p
              style={{
                background: "#7f1d1d",
                color: "#fecaca",
                padding: 10,
                borderRadius: 8,
              }}
            >
              {erro}
            </p>
          ) : null}

          {step === "cert" ? (
            <>
              <label style={{ display: "block", fontSize: 13, marginBottom: 10 }}>
                Arquivo .pfx / .p12 (do seu computador)
                <input
                  type="file"
                  accept=".pfx,.p12,application/x-pkcs12"
                  onChange={(e) => setPfxFile(e.target.files?.[0] || null)}
                  style={{ ...field, padding: 6 }}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 10 }}>
                Senha do certificado
                <input
                  type="password"
                  value={pfxPassword}
                  onChange={(e) => setPfxPassword(e.target.value)}
                  style={field}
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                disabled={busy || !pfxFile}
                onClick={() => void carregarCertificado()}
                style={{
                  marginTop: 8,
                  background: "#1d4ed8",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {busy ? "Lendo certificado…" : "Importar certificado"}
              </button>
            </>
          ) : null}

          {step === "pages" ? (
            <>
              {certLabel ? (
                <p style={{ color: "#6ee7b7", fontSize: 13 }}>{certLabel}</p>
              ) : null}
              <label style={{ display: "block", fontSize: 13, marginBottom: 10 }}>
                Página padrão da aparência (PDFs multipágina)
                <input
                  type="number"
                  min={1}
                  value={defaultPage}
                  onChange={(e) =>
                    setDefaultPage(Math.max(1, Number(e.target.value) || 1))
                  }
                  style={field}
                />
              </label>
              {documentIds.length <= 8 ? (
                <ul style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 18 }}>
                  {documentIds.map((id) => (
                    <li key={id} style={{ marginBottom: 8 }}>
                      {id.slice(0, 8)}…
                      <input
                        type="number"
                        min={1}
                        placeholder="página"
                        value={pageByDoc[id] ?? ""}
                        onChange={(e) =>
                          setPageByDoc((prev) => ({
                            ...prev,
                            [id]: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        style={{
                          ...field,
                          width: 80,
                          display: "inline-block",
                          marginLeft: 8,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void iniciarEAssinar()}
                style={{
                  marginTop: 10,
                  background: "#0f766e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Assinar {documentIds.length > 1 ? "lote" : "documento"}
              </button>
            </>
          ) : null}

          {step === "signing" ? (
            <p style={{ color: "#fbbf24" }}>{progress || "Processando…"}</p>
          ) : null}

          {step === "done" ? (
            <>
              <p style={{ color: "#6ee7b7", fontWeight: 600 }}>Concluído</p>
              <ul style={{ fontSize: 13, lineHeight: 1.5 }}>
                {results.map((r) => (
                  <li key={r.documentId}>
                    {r.documentId.slice(0, 8)}…{" "}
                    {r.ok ? (
                      <>
                        OK —{" "}
                        <a
                          href={`/validar/${r.code}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#7dd3fc" }}
                        >
                          /validar/{r.code}
                        </a>
                      </>
                    ) : (
                      <span style={{ color: "#fca5a5" }}>{r.error}</span>
                    )}
                  </li>
                ))}
              </ul>
              {batchId ? (
                <p style={{ fontSize: 12, opacity: 0.75 }}>Lote: {batchId}</p>
              ) : null}
              {sessionItems.length ? null : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
