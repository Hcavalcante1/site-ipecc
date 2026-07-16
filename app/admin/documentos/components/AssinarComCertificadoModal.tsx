"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CERT_DISCLAIMER } from "@/lib/documentos/assinaturas/certificate/constants";
import {
  CERT_STAMP_BOX,
  type LoadedCertificate,
} from "@/lib/documentos/assinaturas/certificate/clientCertSign";

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

function stampLeftTopPct(
  pageW: number,
  pageH: number,
  boxW: number,
  boxH: number,
  xPct: number,
  yPct: number
): { leftPct: number; topPct: number; wPct: number; hPct: number } {
  const margin = CERT_STAMP_BOX.margin;
  const spanX = Math.max(0, pageW - boxW - 2 * margin);
  const spanY = Math.max(0, pageH - boxH - 2 * margin);
  const xp = Math.min(100, Math.max(0, xPct));
  const yp = Math.min(100, Math.max(0, yPct));
  const left = margin + (spanX * xp) / 100;
  const top = margin + (spanY * yp) / 100;
  return {
    leftPct: (left / pageW) * 100,
    topPct: (top / pageH) * 100,
    wPct: (boxW / pageW) * 100,
    hPct: (boxH / pageH) * 100,
  };
}

/** Preview 1:1 do PDF + carimbo arrastável (posição = carimbo no PDF assinado). */
function CertStampPositionPreview({
  documentId,
  pageNum,
  xPct,
  yPct,
  onChange,
  onPageCount,
  signerLabel,
}: {
  documentId?: string | null;
  pageNum: number;
  xPct: number;
  yPct: number;
  onChange: (x: number, y: number) => void;
  onPageCount?: (n: number) => void;
  signerLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [grabbing, setGrabbing] = useState(false);
  const [pageSize, setPageSize] = useState({ w: 595.28, h: 841.89 });
  const [pageLabel, setPageLabel] = useState("");
  const [loadErro, setLoadErro] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const pdfUrl = documentId
    ? `/api/admin/documentos/${encodeURIComponent(documentId)}/arquivo`
    : null;

  useEffect(() => {
    if (!pdfUrl) {
      setLoadErro("Documento não informado.");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingPdf(true);
      setLoadErro(null);
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const res = await fetch(pdfUrl, { credentials: "include" });
        if (!res.ok) throw new Error("Não foi possível carregar o PDF.");
        const data = new Uint8Array(await res.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        onPageCount?.(doc.numPages);
        const pageIndex = Math.min(
          Math.max(Number(pageNum) || 1, 1),
          doc.numPages
        );
        const page = await doc.getPage(pageIndex);
        const base = page.getViewport({ scale: 1 });
        const targetW = Math.min(900, wrapRef.current?.clientWidth || 720);
        const scale = targetW / base.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        setPageSize({ w: base.width, h: base.height });
        setPageLabel(`Página ${pageIndex} de ${doc.numPages}`);
      } catch (e) {
        if (!cancelled) {
          setLoadErro(
            e instanceof Error ? e.message : "Falha ao renderizar o PDF."
          );
        }
      } finally {
        if (!cancelled) setLoadingPdf(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // onPageCount é setState estável do pai
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, pageNum]);

  const boxW = CERT_STAMP_BOX.w;
  const boxH = CERT_STAMP_BOX.h;
  const geom = stampLeftTopPct(
    pageSize.w,
    pageSize.h,
    boxW,
    boxH,
    xPct,
    yPct
  );

  function autoScrollSeBorda(clientY: number) {
    const sc = scrollRef.current;
    if (!sc) return;
    const r = sc.getBoundingClientRect();
    const zona = 48;
    if (clientY > r.bottom - zona) sc.scrollTop += 18;
    else if (clientY < r.top + zona) sc.scrollTop -= 18;
  }

  function pctFromClient(clientX: number, clientY: number) {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    autoScrollSeBorda(clientY);
    const { w: pageW, h: pageH } = pageSize;
    const margin = CERT_STAMP_BOX.margin;
    const spanX = Math.max(0, pageW - boxW - 2 * margin);
    const spanY = Math.max(0, pageH - boxH - 2 * margin);
    const relX = ((clientX - r.left) / r.width) * pageW;
    const relY = ((clientY - r.top) / r.height) * pageH;
    const x = Math.min(
      100,
      Math.max(0, ((relX - boxW / 2 - margin) / spanX) * 100)
    );
    const y = Math.min(
      100,
      Math.max(0, ((relY - boxH / 2 - margin) / spanY) * 100)
    );
    onChange(Math.round(x), Math.round(y));
  }

  function onPointerDown(e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    setGrabbing(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pctFromClient(e.clientX, e.clientY);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragging.current) return;
    pctFromClient(e.clientX, e.clientY);
  }

  function onPointerUp(e: ReactPointerEvent) {
    dragging.current = false;
    setGrabbing(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  const when = new Date().toLocaleString("pt-BR");

  return (
    <div style={{ marginBottom: 12 }}>
      <p
        style={{
          fontSize: 12,
          color: "#94a3b8",
          margin: "0 0 6px",
          lineHeight: 1.35,
        }}
      >
        Visualize a página e arraste o carimbo (mãozinha) para o local da
        assinatura
        {pageLabel ? ` · ${pageLabel}` : ""}.
      </p>
      {loadErro ? (
        <p style={{ color: "#fca5a5", fontSize: 13 }}>{loadErro}</p>
      ) : null}
      <div
        ref={scrollRef}
        style={{
          borderRadius: 8,
          overflow: "auto",
          maxHeight: "min(58vh, 620px)",
          border: "1px solid #334155",
          background: "#334155",
        }}
      >
        <div
          ref={wrapRef}
          style={{
            position: "relative",
            width: "100%",
            lineHeight: 0,
            background: "#fff",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
          {loadingPdf ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(15,23,42,0.35)",
                color: "#f8fafc",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              Carregando página do documento…
            </div>
          ) : null}
          <div
            role="button"
            aria-label="Arrastar carimbo de assinatura"
            title="Arraste para escolher o local da assinatura"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              position: "absolute",
              left: `${geom.leftPct}%`,
              top: `${geom.topPct}%`,
              width: `${geom.wPct}%`,
              height: `${geom.hPct}%`,
              background: "rgba(237, 244, 252, 0.97)",
              border: "1.5px solid #1e3a5f",
              borderRadius: 2,
              boxSizing: "border-box",
              cursor: grabbing ? "grabbing" : "grab",
              boxShadow: "0 2px 8px rgba(29,78,216,0.35)",
              zIndex: 3,
              touchAction: "none",
              padding: "4px 6px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: 2,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#1a3350",
                lineHeight: 1.2,
              }}
            >
              Assinado digitalmente
            </span>
            <span
              style={{
                fontSize: 9,
                color: "#243447",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {signerLabel.slice(0, 42) || "Titular do certificado"}
            </span>
            <span style={{ fontSize: 8, color: "#475569", lineHeight: 1.2 }}>
              {when}
            </span>
            <span style={{ fontSize: 7, color: "#64748b", marginTop: "auto" }}>
              Certificado local · chave não enviada
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [xPct, setXPct] = useState(96);
  const [yPct, setYPct] = useState(96);
  const [pageCountHint, setPageCountHint] = useState<number | null>(null);
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
    setPreviewDocId(documentIds[0] || null);
    setXPct(96);
    setYPct(96);
    setPageCountHint(null);
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

  const previewPage =
    (previewDocId && pageByDoc[previewDocId]) || defaultPage || 1;

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
      if (!previewDocId && documentIds[0]) setPreviewDocId(documentIds[0]);
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
      let createJson: {
        ok?: boolean;
        error?: string;
        items?: SessionItem[];
        batchId?: string | null;
      } = {};
      try {
        createJson = await createRes.json();
      } catch {
        setErro(
          `Falha ao criar sessão (HTTP ${createRes.status}). Tente novamente.`
        );
        setStep("pages");
        return;
      }
      if (!createRes.ok || !createJson.ok) {
        setErro(createJson.error || "Falha ao criar sessão.");
        setStep("pages");
        return;
      }

      const items = (createJson.items || []) as SessionItem[];
      setSessionItems(items);
      setBatchId(createJson.batchId || null);

      const { signPdfWithLocalCertificate, discardCertificate } = await import(
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
            let detail = "";
            try {
              const errJson = (await dl.json()) as { error?: string };
              detail = errJson.error ? `: ${errJson.error}` : "";
            } catch {
              /* ignore */
            }
            throw new Error(
              `Falha ao baixar o PDF original (HTTP ${dl.status})${detail}`
            );
          }
          const pdfBytes = new Uint8Array(await dl.arrayBuffer());
          const page = pageByDoc[item.documentId] || defaultPage || 1;

          const signed = await signPdfWithLocalCertificate({
            pdfBytes,
            expectedHashSha256: item.documentHashSha256,
            cert,
            appearance: {
              page,
              xPct,
              yPct,
              width: CERT_STAMP_BOX.w,
              height: CERT_STAMP_BOX.h,
              signerLabel: cert.subject,
            },
          });

          const form = new FormData();
          form.append("action", "concluir");
          form.append("transactionId", item.transactionId);
          form.append(
            "signedPdf",
            new Blob([signed.signedPdfBytes], { type: "application/pdf" }),
            "assinado.pdf"
          );
          form.append(
            "pkcs7",
            new Blob([signed.pkcs7Bytes], {
              type: "application/pkcs7-signature",
            }),
            "assinatura.p7s"
          );
          form.append(
            "cert",
            JSON.stringify({
              subject: cert.subject,
              issuer: cert.issuer,
              serial: cert.serial,
              notBefore: cert.notBefore,
              notAfter: cert.notAfter,
              thumbprintSha256: cert.thumbprintSha256,
            })
          );
          form.append(
            "appearance",
            JSON.stringify({
              page,
              x: xPct,
              y: yPct,
              width: CERT_STAMP_BOX.w,
              height: CERT_STAMP_BOX.h,
            })
          );

          const concl = await fetch(
            `/api/admin/documentos/assinaturas-certificado/${item.transactionId}`,
            {
              method: "POST",
              body: form,
            }
          );
          let conclJson: {
            ok?: boolean;
            error?: string;
            validationCode?: string;
          } = {};
          try {
            conclJson = await concl.json();
          } catch {
            throw new Error(
              `Falha ao gravar assinatura (HTTP ${concl.status}). O PDF pode ser grande demais para o envio.`
            );
          }
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
          width: "min(920px, 100%)",
          maxHeight: "92vh",
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

              {documentIds.length > 1 ? (
                <label
                  style={{ display: "block", fontSize: 13, marginBottom: 10 }}
                >
                  Documento no preview
                  <select
                    value={previewDocId || ""}
                    onChange={(e) => setPreviewDocId(e.target.value || null)}
                    style={field}
                  >
                    {documentIds.map((id) => (
                      <option key={id} value={id}>
                        {id.slice(0, 8)}…
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label style={{ display: "block", fontSize: 13, marginBottom: 10 }}>
                Página da aparência
                {pageCountHint ? ` (1–${pageCountHint})` : ""}
                <input
                  type="number"
                  min={1}
                  max={pageCountHint || undefined}
                  value={
                    previewDocId && pageByDoc[previewDocId] != null
                      ? pageByDoc[previewDocId]
                      : defaultPage
                  }
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value) || 1);
                    setDefaultPage(n);
                    if (previewDocId) {
                      setPageByDoc((prev) => ({ ...prev, [previewDocId]: n }));
                    }
                  }}
                  style={field}
                />
              </label>

              <CertStampPositionPreview
                documentId={previewDocId}
                pageNum={previewPage}
                xPct={xPct}
                yPct={yPct}
                onChange={(x, y) => {
                  setXPct(x);
                  setYPct(y);
                }}
                onPageCount={setPageCountHint}
                signerLabel={certRef.current?.subject || ""}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <label style={{ fontSize: 12, color: "#94a3b8" }}>
                  Horizontal: {xPct}% (0 esquerda · 100 direita)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={xPct}
                    onChange={(e) => setXPct(Number(e.target.value))}
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>
                  Vertical: {yPct}% (0 topo · 100 rodapé)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={yPct}
                    onChange={(e) => setYPct(Number(e.target.value))}
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </label>
              </div>

              {documentIds.length > 1 && documentIds.length <= 8 ? (
                <ul style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 18 }}>
                  {documentIds.map((id) => (
                    <li key={id} style={{ marginBottom: 8 }}>
                      Página de {id.slice(0, 8)}…
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

              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                A posição do carimbo (arraste acima) será aplicada
                {documentIds.length > 1
                  ? " a todos os documentos do lote"
                  : " neste documento"}
                .
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={() => void iniciarEAssinar()}
                style={{
                  marginTop: 6,
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
