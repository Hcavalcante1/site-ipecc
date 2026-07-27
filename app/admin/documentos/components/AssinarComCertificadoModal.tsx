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
import {
  getCertificateHolderLabel,
  getCertificateHolderCnpj,
} from "@/lib/documentos/assinaturas/certificate/certificateIdentity";
import QRCode from "qrcode";

type Props = {
  open: boolean;
  onClose: () => void;
  documentIds: string[];
  documentNames?: Record<string, string>;
  onCompleted?: () => void;
};

type SessionItem = {
  itemId: string | null;
  transactionId: string;
  documentId: string;
  documentHashSha256: string;
  downloadPath: string;
  validationCode: string;
};

type SavedCertificateProfile = {
  id: string;
  label: string;
  source_filename: string | null;
  cert_subject: string | null;
  cert_issuer: string | null;
  cert_serial: string | null;
  cert_not_before: string | null;
  cert_not_after: string | null;
  cert_thumbprint_sha256: string | null;
  cert_thumbprint_sha1: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

type Step = "cert" | "review" | "pages" | "preview" | "signing" | "done";

type PageStamp = { xPct: number; yPct: number };
type DocStamps = Record<number, PageStamp>; // chave = número da página (1-based)

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

function u8ToBlob(u8: Uint8Array, mime: string): Blob {
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return new Blob([copy], { type: mime });
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function formatCpf(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCnpj(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatThumb(hex: string): string {
  return hex
    .replace(/[^0-9a-fA-F]/g, "")
    .toUpperCase()
    .replace(/(.{2})(?=.)/g, "$1 ");
}

/** Cartão do certificado real — equivalente ao “Detalhes do certificado” do Adobe. */
function CertificateReviewCard({ cert }: { cert: LoadedCertificate }) {
  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#f1f5f9",
            wordBreak: "break-word",
            lineHeight: 1.35,
          }}
        >
          {value}
        </div>
      </div>
    ) : null;

  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 12,
        padding: 14,
        borderRadius: 8,
        border: "1px solid #334155",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#6ee7b7",
          marginBottom: 10,
          letterSpacing: 0.3,
        }}
      >
        Conteúdo bruto do certificado
      </div>
      {row("Emitido para (CN)", cert.subject)}
      {row("Responsável (ICP-Brasil)", cert.icpBrasil.responsavel)}
      {row("Razão social (ICP-Brasil)", cert.icpBrasil.razaoSocial)}
      {row("CPF", formatCpf(cert.icpBrasil.cpf))}
      {row("CNPJ", formatCnpj(cert.icpBrasil.cnpj))}
      {row("Emissor", cert.issuer)}
      {row(
        "Validade",
        `${new Date(cert.notBefore).toLocaleDateString("pt-BR")} até ${new Date(
          cert.notAfter
        ).toLocaleDateString("pt-BR")}`
      )}
      {row("Número de série", cert.serial)}
      {row("Impressão digital SHA-1", formatThumb(cert.thumbprintSha1))}
      {row("Impressão digital SHA-256", formatThumb(cert.thumbprintSha256))}
      {row("DN do titular", cert.subjectDn)}
      {row("DN do emissor", cert.issuerDn)}
    </div>
  );
}

function SignatureAppearancePreview({ cert }: { cert: LoadedCertificate }) {
  const label = getCertificateHolderLabel(cert);
  const when = new Date().toLocaleString("pt-BR");
  const cnpj = getCertificateHolderCnpj(cert);
  const cpf = formatCpf(cert.icpBrasil.cpf);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL("https://validar.iti.gov.br", {
      margin: 0,
      width: 110,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
      <div
        style={{
          marginTop: 12,
          marginBottom: 12,
          borderRadius: 8,
          background: "#ffffff",
          color: "#000",
          padding: 4,
          display: "inline-flex",
          flexDirection: "row",
          gap: 2,
          alignItems: "center",
          width: "fit-content",
          maxWidth: "100%",
        }}
      >
      <div
        style={{
          minWidth: 0,
          flex: "0 1 auto",
          maxWidth: 166,
          fontSize: 6.4,
          lineHeight: 1.01,
          fontFamily: "Helvetica, Arial, sans-serif",
          color: "#000",
        }}
      >
        <div style={{ fontSize: 6.8, fontWeight: 700, lineHeight: 1.01 }}>Assinado digitalmente por</div>
        <div style={{ marginTop: 1, fontWeight: 700, fontSize: 7.0, lineHeight: 1.01, wordBreak: "break-word" }}>
          {label.toUpperCase()}
        </div>
        <div style={{ marginTop: 0, fontWeight: 400, fontSize: 6.1 }}>CNPJ: {cnpj || ""}</div>
        <div style={{ marginTop: 0, fontWeight: 400, fontSize: 5.9, wordBreak: "break-word" }}>
          {[cert.icpBrasil.razaoSocial ? `Razão social: ${cert.icpBrasil.razaoSocial}` : null, cert.icpBrasil.responsavel ? `Responsável: ${cert.icpBrasil.responsavel}` : null]
            .filter(Boolean)
            .join(" • ")}
        </div>
        <div style={{ marginTop: 0, fontWeight: 400, fontSize: 5.9 }}>CPF: {cpf || ""}</div>
        <div style={{ marginTop: 0, fontWeight: 400, fontSize: 5.9 }}>Dados: {when}</div>
      </div>
      <div
        style={{
          width: 48,
          minWidth: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 0,
          fontSize: 5.0,
          lineHeight: 1.02,
          fontFamily: "Helvetica, Arial, sans-serif",
          color: "#000",
        }}
      >
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR Code de validação"
            style={{ width: 48, height: 48, display: "block", flex: "0 0 auto" }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              border: "1px solid #94a3b8",
              background: "#f8fafc",
              flex: "0 0 auto",
            }}
          />
        )}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, lineHeight: 1.01, fontSize: 4.5 }}>VALIDAR ITI</div>
          <div style={{ lineHeight: 1.01, fontSize: 4.0 }}>verifique em validar.iti.gov.br</div>
        </div>
      </div>
    </div>
  );
}

function CertStampPositionPreview({
  documentId,
  pageStamps,
  onStampChange,
  onStampRemove,
  signerLabel,
  stampSubject,
  stampCnpj,
  stampCpf,
  stampRazaoSocial,
  stampResponsavel,
  onPageCountKnown,
}: {
  documentId?: string | null;
  pageStamps: DocStamps;
  onStampChange: (page: number, xPct: number, yPct: number) => void;
  onStampRemove: (page: number) => void;
  signerLabel: string;
  stampSubject?: string | null;
  stampCnpj?: string | null;
  stampCpf?: string | null;
  stampRazaoSocial?: string | null;
  stampResponsavel?: string | null;
  onPageCountKnown?: (count: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const draggingPage = useRef<number | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<
    Array<{ index: number; w: number; h: number; dataUrl: string }>
  >([]);
  const [loadErro, setLoadErro] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const pdfUrl = documentId
    ? `/api/admin/documentos/${encodeURIComponent(documentId)}/arquivo`
    : null;

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL("https://validar.iti.gov.br", {
      margin: 0,
      width: 96,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, []);

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
        if (!res.ok) {
          let detail = "";
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) detail = ` ${j.error}`;
          } catch {
            /* ignore */
          }
          throw new Error(
            `Não foi possível carregar o PDF (HTTP ${res.status}).${detail}`
          );
        }
        const data = new Uint8Array(await res.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        const targetW = Math.min(
          860,
          scrollRef.current?.clientWidth || 720
        );
        const rendered: Array<{
          index: number;
          w: number;
          h: number;
          dataUrl: string;
        }> = [];

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = targetW / base.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push({
            index: i,
            w: base.width,
            h: base.height,
            dataUrl: canvas.toDataURL("image/jpeg", 0.82),
          });
        }
        if (cancelled) return;
        setPages(rendered);
        pageRefs.current = rendered.map(() => null);
        onPageCountKnown?.(rendered.length);
      } catch (e) {
        if (!cancelled) {
          // Fallback: página A4 em branco para ainda posicionar a aparência
          const blank = document.createElement("canvas");
          blank.width = 595;
          blank.height = 842;
          const ctx = blank.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, blank.width, blank.height);
            ctx.fillStyle = "#999999";
            ctx.font = "14px Helvetica, Arial, sans-serif";
            ctx.fillText(
              "Pré-visualização sem PDF (arquivo indisponível)",
              40,
              60
            );
            setPages([
              {
                index: 1,
                w: 595.28,
                h: 841.89,
                dataUrl: blank.toDataURL("image/jpeg", 0.9),
              },
            ]);
            pageRefs.current = [null];
          }
          setLoadErro(
            e instanceof Error
              ? `${e.message} — usando página em branco para posicionar.`
              : "Falha ao renderizar o PDF."
          );
        }
      } finally {
        if (!cancelled) setLoadingPdf(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  function positionOnPage(
    clientX: number,
    clientY: number,
    pageEl: HTMLDivElement | null,
    meta: { w: number; h: number }
  ): { xPct: number; yPct: number } | null {
    if (!pageEl) return null;
    const r = pageEl.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    const margin = CERT_STAMP_BOX.margin;
    const boxW = CERT_STAMP_BOX.w;
    const boxH = CERT_STAMP_BOX.h;
    const spanX = Math.max(0, meta.w - boxW - 2 * margin);
    const spanY = Math.max(0, meta.h - boxH - 2 * margin);
    const relX = ((clientX - r.left) / r.width) * meta.w;
    const relY = ((clientY - r.top) / r.height) * meta.h;
    return {
      xPct: Math.round(Math.min(100, Math.max(0, ((relX - boxW / 2 - margin) / Math.max(spanX, 1)) * 100))),
      yPct: Math.round(Math.min(100, Math.max(0, ((relY - boxH / 2 - margin) / Math.max(spanY, 1)) * 100))),
    };
  }

  const when = (() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const tzMin = -now.getTimezoneOffset();
    const tzSign = tzMin >= 0 ? "+" : "-";
    const tzAbs = Math.abs(tzMin);
    const tz = `${tzSign}${pad(Math.floor(tzAbs / 60))}:${pad(tzAbs % 60)}`;
    return `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${tz}`;
  })();

  const stampCount = Object.keys(pageStamps).length;

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 6px", lineHeight: 1.35 }}>
        Clique em qualquer página para adicionar o carimbo naquele local. Arraste para reposicionar. Botão ✕ remove.
        {stampCount > 0
          ? ` · ${stampCount} página${stampCount > 1 ? "s" : ""} com carimbo`
          : " · Nenhum carimbo posicionado ainda"}
      </p>
      {loadErro ? <p style={{ color: "#fca5a5", fontSize: 13 }}>{loadErro}</p> : null}
      <div
        ref={scrollRef}
        style={{ borderRadius: 8, overflow: "auto", maxHeight: "min(62vh, 680px)", border: "1px solid #334155", background: "#334155", padding: 8 }}
      >
        {loadingPdf ? <p style={{ color: "#f8fafc", fontSize: 13, padding: 16 }}>Carregando documento…</p> : null}
        {pages.map((p, idx) => {
          const stamp = pageStamps[p.index];
          const g = stamp
            ? stampLeftTopPct(p.w, p.h, CERT_STAMP_BOX.w, CERT_STAMP_BOX.h, stamp.xPct, stamp.yPct)
            : null;
          const isDragging = draggingPage.current === p.index;
          return (
            <div
              key={p.index}
              ref={(el) => { pageRefs.current[idx] = el; }}
              style={{
                position: "relative",
                width: "100%",
                lineHeight: 0,
                background: "#fff",
                marginBottom: 10,
                boxShadow: stamp
                  ? "0 0 0 2px #3b82f6, 0 1px 4px rgba(0,0,0,0.25)"
                  : "0 1px 4px rgba(0,0,0,0.25)",
                cursor: stamp ? "default" : "crosshair",
              }}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("[data-stamp]")) return;
                const pos = positionOnPage(e.clientX, e.clientY, pageRefs.current[idx], p);
                if (pos) onStampChange(p.index, pos.xPct, pos.yPct);
              }}
            >
              <div style={{
                position: "absolute", top: 4, left: 4, fontSize: 9, fontWeight: 700, zIndex: 4,
                background: stamp ? "#3b82f6" : "rgba(0,0,0,0.3)",
                color: "#fff", borderRadius: 4, padding: "1px 6px", lineHeight: 1.5,
              }}>
                Pág. {p.index}
              </div>
              {!stamp && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ border: "2px dashed #475569", borderRadius: 8, padding: "6px 16px", color: "#64748b", fontSize: 11, background: "rgba(255,255,255,0.6)" }}>
                    Clique para adicionar carimbo
                  </div>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.dataUrl} alt={`Página ${p.index}`} draggable={false} style={{ width: "100%", height: "auto", display: "block" }} />
              {stamp && g ? (
                <div
                  data-stamp="1"
                  role="button"
                  aria-label="Arrastar carimbo"
                  title="Arraste para reposicionar"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    draggingPage.current = p.index;
                    setGrabbing(true);
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (draggingPage.current !== p.index) return;
                    const pos = positionOnPage(e.clientX, e.clientY, pageRefs.current[idx], p);
                    if (pos) onStampChange(p.index, pos.xPct, pos.yPct);
                  }}
                  onPointerUp={(e) => {
                    draggingPage.current = null;
                    setGrabbing(false);
                    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
                  }}
                  onPointerCancel={(e) => {
                    draggingPage.current = null;
                    setGrabbing(false);
                    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
                  }}
                  style={{
                    position: "absolute",
                    left: `${g.leftPct}%`,
                    top: `${g.topPct}%`,
                    width: `${g.wPct}%`,
                    height: `${g.hPct}%`,
                    background: "#ffffff",
                    boxSizing: "border-box",
                    cursor: isDragging ? "grabbing" : "grab",
                    outline: isDragging ? "1px dashed #999" : "1px dashed transparent",
                    zIndex: 3,
                    touchAction: "none",
                    padding: "4px 6px",
                    display: "flex",
                    overflow: "hidden",
                    alignItems: "stretch",
                  }}
                >
                  {/* Botão remover */}
                  <button
                    type="button"
                    data-stamp="1"
                    onClick={(e) => { e.stopPropagation(); onStampRemove(p.index); }}
                    title="Remover carimbo desta página"
                    style={{
                      position: "absolute", top: 1, right: 1, width: 13, height: 13,
                      background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: 2,
                      cursor: "pointer", fontSize: 8, lineHeight: 1, zIndex: 5,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✕</button>
                  <div style={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "row", gap: 4, fontSize: 6.4, lineHeight: 1.02, fontFamily: "Helvetica, Arial, sans-serif", color: "#000" }}>
                    <div style={{ minWidth: 0, flex: "0 1 auto", maxWidth: 170 }}>
                      <div style={{ fontSize: 6.8, fontWeight: 700 }}>Assinado digitalmente por</div>
                      <div style={{ marginTop: 1, fontSize: 7, fontWeight: 700, wordBreak: "break-word" }}>
                        {String(stampSubject || signerLabel).toUpperCase() || "TITULAR DO CERTIFICADO"}
                      </div>
                      <div style={{ fontSize: 6.1 }}>CNPJ: {stampCnpj || ""}</div>
                      <div style={{ fontSize: 5.9, wordBreak: "break-word" }}>
                        {[stampRazaoSocial ? `Razão social: ${stampRazaoSocial}` : null, stampResponsavel ? `Responsável: ${stampResponsavel}` : null].filter(Boolean).join(" • ")}
                      </div>
                      {stampCpf && <div style={{ fontSize: 5.9 }}>CPF: {stampCpf}</div>}
                      <div style={{ fontSize: 5.9 }}>Dados: {when}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", flex: "0 0 auto" }}>
                      {qrDataUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={qrDataUrl} alt="QR" style={{ width: 48, height: 48, display: "block" }} />
                        : <div style={{ width: 53, height: 53, border: "1px solid #94a3b8", background: "#f8fafc" }} />
                      }
                      <div style={{ textAlign: "center", fontSize: 4.4 }}>
                        <div style={{ fontWeight: 700 }}>VALIDAR ITI</div>
                        <div>verifique em validar.iti.gov.br</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AssinarComCertificadoModal({
  open,
  onClose,
  documentIds,
  documentNames,
  onCompleted,
}: Props) {
  const [step, setStep] = useState<Step>("cert");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [pfxPassword, setPfxPassword] = useState("");
  const [certLabel, setCertLabel] = useState<string | null>(null);
  const [certPreview, setCertPreview] = useState<LoadedCertificate | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<SavedCertificateProfile[]>(
    []
  );
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingSavedProfile, setLoadingSavedProfile] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedProfilePassword, setSelectedProfilePassword] = useState("");
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<string, DocStamps>>({});
  const [docPageCounts, setDocPageCounts] = useState<Record<string, number>>({});

  function getDocStamps(docId: string | null | undefined): DocStamps {
    if (!docId) return {};
    return placements[docId] ?? {};
  }

  function setPageStamp(docId: string | null | undefined, page: number, xPct: number, yPct: number) {
    if (!docId) return;
    setPlacements((prev) => ({
      ...prev,
      [docId]: { ...(prev[docId] ?? {}), [page]: { xPct, yPct } },
    }));
  }

  function removePageStamp(docId: string | null | undefined, page: number) {
    if (!docId) return;
    setPlacements((prev) => {
      const next = { ...(prev[docId] ?? {}) };
      delete next[page];
      return { ...prev, [docId]: next };
    });
  }

  function stampAllPages(docId: string | null | undefined, count: number) {
    if (!docId || count < 1) return;
    setPlacements((prev) => {
      const existing = prev[docId] ?? {};
      const next: DocStamps = {};
      for (let pg = 1; pg <= count; pg++) {
        next[pg] = existing[pg] ?? { xPct: 96, yPct: 96 };
      }
      return { ...prev, [docId]: next };
    });
  }

  function removeAllPageStamps(docId: string | null | undefined) {
    if (!docId) return;
    setPlacements((prev) => ({ ...prev, [docId]: {} }));
  }

  function docLabel(id: string) {
    return documentNames?.[id] || `${id.slice(0, 8)}…`;
  }
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<
    Array<{
      documentId: string;
      transactionId?: string;
      ok: boolean;
      code?: string;
      error?: string;
    }>
  >([]);
  const certRef = useRef<LoadedCertificate | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("cert");
    setErro(null);
    setPfxFile(null);
    setPfxPassword("");
    setCertLabel(null);
    setCertPreview(null);
    setSelectedProfileId("");
    setSelectedProfilePassword("");
    setPreviewDocId(documentIds[0] || null);
    setPlacements({});
    setDocPageCounts({});
    setSessionItems([]);
    setBatchId(null);
    setProgress("");
    setResults([]);
    certRef.current = null;
  }, [open, documentIds]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingProfiles(true);
      try {
        const res = await fetch("/api/admin/documentos/certificados", {
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          profiles?: SavedCertificateProfile[];
          error?: string;
        };
        if (!cancelled && res.ok && json.ok) {
          setSavedProfiles(json.profiles || []);
          if (json.profiles?.length) {
            setSelectedProfileId((current) => current || json.profiles![0].id);
          }
        }
      } catch {
        if (!cancelled) setSavedProfiles([]);
      } finally {
        if (!cancelled) setLoadingProfiles(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

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
      setCertPreview(loaded);
      setCertLabel(getCertificateHolderLabel(loaded));
      if (!previewDocId && documentIds[0]) setPreviewDocId(documentIds[0]);
      setStep("review");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ler o certificado.");
    } finally {
      setBusy(false);
    }
  }

  function buildCertMetadata(cert: LoadedCertificate) {
    return {
      subject: cert.subject,
      issuer: cert.issuer,
      serial: cert.serial,
      notBefore: cert.notBefore,
      notAfter: cert.notAfter,
      thumbprintSha256: cert.thumbprintSha256,
      thumbprintSha1: cert.thumbprintSha1,
      icpBrasil: cert.icpBrasil,
    };
  }

  async function salvarCertificadoNaPlataforma() {
    const cert = certRef.current;
    if (!cert || !pfxFile) {
      setErro("Carregue o certificado antes de salvar na plataforma.");
      return;
    }

    setSavingProfile(true);
    setErro(null);
    try {
      const form = new FormData();
      form.append("pfx", pfxFile, pfxFile.name);
      form.append("sourceFilename", pfxFile.name);
      form.append("label", getCertificateHolderLabel(cert));
      form.append("metadata", JSON.stringify(buildCertMetadata(cert)));

      const res = await fetch("/api/admin/documentos/certificados", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        profile?: SavedCertificateProfile;
      };
      if (!res.ok || !json.ok || !json.profile) {
        throw new Error(json.error || "Falha ao salvar certificado.");
      }
      setSavedProfiles((current) => [json.profile!, ...current.filter((p) => p.id !== json.profile!.id)]);
      setSelectedProfileId(json.profile.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar certificado.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function carregarCertificadoSalvo(profileId: string) {
    if (!profileId) {
      setErro("Selecione um certificado salvo.");
      return;
    }
    if (!selectedProfilePassword) {
      setErro("Informe a senha do certificado salvo.");
      return;
    }

    setLoadingSavedProfile(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/admin/documentos/certificados/${encodeURIComponent(profileId)}/arquivo`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) {
        let detail = "";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) detail = ` ${j.error}`;
        } catch {
          /* ignore */
        }
        throw new Error(
          `Falha ao carregar o certificado salvo (HTTP ${res.status}).${detail}`
        );
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      const file = new File([buf], "certificado-salvo.pfx", {
        type: "application/x-pkcs12",
      });

      const { loadPfxFromFile } = await import(
        "@/lib/documentos/assinaturas/certificate/clientCertSign"
      );
      const loaded = await loadPfxFromFile(file, selectedProfilePassword);
      certRef.current = loaded;
      setCertPreview(loaded);
      setCertLabel(getCertificateHolderLabel(loaded));
      if (!previewDocId && documentIds[0]) setPreviewDocId(documentIds[0]);
      setStep("review");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar certificado salvo.");
    } finally {
      setLoadingSavedProfile(false);
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
        transactionId?: string;
        ok: boolean;
        code?: string;
        error?: string;
      }> = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const docStamps = getDocStamps(item.documentId);
        const stampEntries = Object.entries(docStamps).map(([pg, s]) => ({
          page: Number(pg),
          xPct: s.xPct,
          yPct: s.yPct,
          width: CERT_STAMP_BOX.w,
          height: CERT_STAMP_BOX.h,
          signerLabel: getCertificateHolderLabel(cert),
        }));
        if (stampEntries.length === 0) {
          // Fallback: carimbo no canto inferior-direito da página 1
          stampEntries.push({ page: 1, xPct: 96, yPct: 96, width: CERT_STAMP_BOX.w, height: CERT_STAMP_BOX.h, signerLabel: getCertificateHolderLabel(cert) });
        }
        setProgress(
          `Assinando ${i + 1}/${items.length}: ${docLabel(item.documentId)}`
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

          const signed = await signPdfWithLocalCertificate({
            pdfBytes,
            expectedHashSha256: item.documentHashSha256,
            cert,
            validationCode: item.validationCode,
            stamps: stampEntries,
          });

          const fileName = documentNames?.[item.documentId]
            ? `assinado-${documentNames[item.documentId]}`
            : `assinado-${item.documentId.slice(0, 8)}.pdf`;
          triggerDownload(
            u8ToBlob(signed.signedPdfBytes, "application/pdf"),
            fileName
          );

          const form = new FormData();
          form.append("action", "concluir");
          form.append("transactionId", item.transactionId);
          form.append(
            "signedPdf",
            u8ToBlob(signed.signedPdfBytes, "application/pdf"),
            "assinado.pdf"
          );
          form.append(
            "pkcs7",
            u8ToBlob(signed.pkcs7Bytes, "application/pkcs7-signature"),
            "assinatura.p7s"
          );
          form.append(
            "cert",
            JSON.stringify({
              subject: getCertificateHolderLabel(cert),
              subjectCn: cert.subject,
              issuer: cert.issuer,
              serial: cert.serial,
              notBefore: cert.notBefore,
              notAfter: cert.notAfter,
              thumbprintSha256: cert.thumbprintSha256,
              thumbprintSha1: cert.thumbprintSha1,
              icpBrasil: cert.icpBrasil,
            })
          );
          form.append(
            "appearance",
            JSON.stringify({
              page: stampEntries[0].page,
              x: stampEntries[0].xPct,
              y: stampEntries[0].yPct,
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
              `Falha ao concluir a assinatura (HTTP ${concl.status}). O PDF já foi gerado e baixado no seu computador, mas a gravação na plataforma falhou.`
            );
          }
          if (!concl.ok || !conclJson.ok) {
            throw new Error(
              conclJson.error ||
                "Falha ao concluir a assinatura. O PDF já foi gerado e baixado no seu computador."
            );
          }
          out.push({
            documentId: item.documentId,
            transactionId: item.transactionId,
            ok: true,
            code: conclJson.validationCode,
          });
        } catch (e) {
          out.push({
            documentId: item.documentId,
            transactionId: item.transactionId,
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
        justifyContent: "space-between",
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
                padding: 8,
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
              <div
                style={{
                  marginTop: 18,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#0b1220",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  Certificados salvos na plataforma
                </div>
                <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.45 }}>
                  O arquivo pode ficar guardado criptografado para reuso posterior.
                </div>
                <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    style={field}
                  >
                    <option value="">
                      {loadingProfiles
                        ? "Carregando certificados..."
                        : savedProfiles.length
                          ? "Escolha um certificado salvo"
                          : "Nenhum certificado salvo"}
                    </option>
                    {savedProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="password"
                    value={selectedProfilePassword}
                    onChange={(e) => setSelectedProfilePassword(e.target.value)}
                    placeholder="Senha para reabrir o certificado salvo"
                    style={field}
                    autoComplete="off"
                  />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={busy || savingProfile || !certPreview || !pfxFile}
                      onClick={() => void salvarCertificadoNaPlataforma()}
                      style={{
                        background: "#7c3aed",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: busy || savingProfile || !certPreview || !pfxFile ? 0.6 : 1,
                      }}
                    >
                      {savingProfile ? "Salvando…" : "Salvar na plataforma"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || loadingSavedProfile || !selectedProfileId}
                      onClick={() => void carregarCertificadoSalvo(selectedProfileId)}
                      style={{
                        background: "#0f766e",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: busy || loadingSavedProfile || !selectedProfileId ? 0.6 : 1,
                      }}
                    >
                      {loadingSavedProfile ? "Abrindo…" : "Usar certificado salvo"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step === "review" && certPreview ? (
            <>
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.45 }}>
                Confira se este é o certificado correto (mesmo titular que o Adobe
                mostra ao abrir o .pfx). A chave privada permanece só no seu
                computador.
              </p>
              <CertificateReviewCard cert={certPreview} />
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.45 }}>
                Prévia da aparência oficial da assinatura:
              </p>
              <SignatureAppearancePreview cert={certPreview} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    certRef.current = null;
                    setCertPreview(null);
                    setCertLabel(null);
                    setStep("cert");
                  }}
                  style={{
                    background: "transparent",
                    color: "#cbd5e1",
                    border: "1px solid #475569",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Trocar certificado
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep("pages")}
                  style={{
                    background: "#1d4ed8",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Continuar para posicionar o carimbo
                </button>
              </div>
            </>
          ) : null}

          {step === "pages" ? (() => {
            const currentIdx = previewDocId
              ? Math.max(0, documentIds.indexOf(previewDocId))
              : 0;
            const isFirst = currentIdx === 0;
            const isLast = currentIdx === documentIds.length - 1;
            const posicionados = documentIds.filter((id) =>
              Object.keys(placements[id] ?? {}).length > 0
            ).length;
            const allPositioned = posicionados >= documentIds.length;

            function goTo(idx: number) {
              setPreviewDocId(documentIds[idx] || null);
            }

            return (
              <>
                {certLabel ? (
                  <div style={{ color: "#6ee7b7", fontSize: 13, marginBottom: 8, lineHeight: 1.35 }}>
                    <div>Assinando como: <strong>{certLabel}</strong></div>
                    {certPreview?.icpBrasil.cnpj ? (
                      <div>CNPJ: {getCertificateHolderCnpj(certPreview) || ""}</div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setStep("review")}
                      style={{ background: "none", border: "none", color: "#7dd3fc", cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}
                    >
                      ver certificado
                    </button>
                  </div>
                ) : null}

                {/* Cabeçalho do documento atual */}
                <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                  {documentIds.length > 1 ? (
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                      Documento {currentIdx + 1} de {documentIds.length}
                      {" — "}
                      <span style={{ color: allPositioned ? "#6ee7b7" : "#fbbf24" }}>
                        {posicionados}/{documentIds.length} posicionados
                      </span>
                    </div>
                  ) : null}
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0", wordBreak: "break-all" }}>
                    {docLabel(previewDocId || documentIds[0] || "")}
                    {Object.keys(placements[previewDocId || ""] ?? {}).length > 0 ? (
                      <span style={{ marginLeft: 8, color: "#6ee7b7", fontSize: 12 }}>✓ {Object.keys(placements[previewDocId || ""] ?? {}).length} carimbo(s)</span>
                    ) : (
                      <span style={{ marginLeft: 8, color: "#f59e0b", fontSize: 12 }}>▼ clique nas páginas</span>
                    )}
                  </div>
                </div>

                <CertStampPositionPreview
                  documentId={previewDocId}
                  pageStamps={getDocStamps(previewDocId)}
                  onStampChange={(page, xPct, yPct) => setPageStamp(previewDocId, page, xPct, yPct)}
                  onStampRemove={(page) => removePageStamp(previewDocId, page)}
                  signerLabel={certRef.current ? getCertificateHolderLabel(certRef.current) : ""}
                  stampSubject={certLabel || certPreview?.subject || null}
                  stampCnpj={certPreview ? getCertificateHolderCnpj(certPreview) : null}
                  stampCpf={formatCpf(certPreview?.icpBrasil.cpf)}
                  stampRazaoSocial={certPreview?.icpBrasil.razaoSocial || null}
                  stampResponsavel={certPreview?.icpBrasil.responsavel || null}
                  onPageCountKnown={(count) => {
                    if (!previewDocId) return;
                    setDocPageCounts((prev) => ({ ...prev, [previewDocId]: count }));
                  }}
                />

                {/* Ações rápidas de carimbo */}
                {(() => {
                  const docId = previewDocId || documentIds[0] || "";
                  const count = docPageCounts[docId] || 0;
                  const stamped = Object.keys(getDocStamps(docId)).length;
                  return (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: stamped > 0 ? "#6ee7b7" : "#94a3b8" }}>
                        {stamped > 0 ? `${stamped} página${stamped > 1 ? "s" : ""} com carimbo` : "Nenhuma página carimbada"}
                        {count > 0 ? ` de ${count}` : ""}
                      </span>
                      {count > 1 && (
                        <button
                          type="button"
                          onClick={() => stampAllPages(docId, count)}
                          style={{ background: "#0f766e", color: "#6ee7b7", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          Carimbar todas as {count} páginas
                        </button>
                      )}
                      {stamped > 0 && (
                        <button
                          type="button"
                          onClick={() => removeAllPageStamps(docId)}
                          style={{ background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}
                        >
                          Remover todos
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Navegação entre documentos */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                  {documentIds.length > 1 ? (
                    <>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => goTo(currentIdx - 1)}
                        style={{ background: "transparent", color: "#cbd5e1", border: "1px solid #475569", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: isFirst ? "not-allowed" : "pointer", opacity: isFirst ? 0.4 : 1 }}
                      >
                        ← Anterior
                      </button>

                      {/* Mini-lista de todos os documentos */}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
                        {documentIds.map((id, i) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => goTo(i)}
                            title={docLabel(id)}
                            style={{
                              background: id === previewDocId ? "#1d4ed8" : Object.keys(placements[id] ?? {}).length > 0 ? "#064e3b" : "#1e293b",
                              border: `1px solid ${id === previewDocId ? "#3b82f6" : Object.keys(placements[id] ?? {}).length > 0 ? "#059669" : "#475569"}`,
                              color: id === previewDocId ? "#fff" : Object.keys(placements[id] ?? {}).length > 0 ? "#6ee7b7" : "#94a3b8",
                              borderRadius: 6,
                              padding: "4px 10px",
                              fontSize: 11,
                              cursor: "pointer",
                              fontWeight: id === previewDocId ? 700 : 400,
                            }}
                          >
                            {i + 1}{Object.keys(placements[id] ?? {}).length > 0 ? " ✓" : ""}
                          </button>
                        ))}
                      </div>

                      {!isLast ? (
                        <button
                          type="button"
                          onClick={() => goTo(currentIdx + 1)}
                          style={{ background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer" }}
                        >
                          Próximo →
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStep("preview")}
                          style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer" }}
                        >
                          Ver prévia final →
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setStep("preview")}
                      style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Ver prévia final
                    </button>
                  )}
                </div>

                {documentIds.length > 1 && !isLast ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setStep("preview")}
                    style={{ marginTop: 8, background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
                  >
                    Pular para prévia final ({posicionados}/{documentIds.length} posicionados)
                  </button>
                ) : null}
              </>
            );
          })() : null}

          {step === "preview" && certPreview ? (
            <>
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.45 }}>
                Esta é a prévia final. Se estiver tudo certo, clique em assinar.
                A gravação só acontece depois desta confirmação.
              </p>
              <CertificateReviewCard cert={certPreview} />
              <SignatureAppearancePreview cert={certPreview} />
              <CertStampPositionPreview
                documentId={previewDocId}
                pageStamps={getDocStamps(previewDocId)}
                onStampChange={(page, xPct, yPct) => setPageStamp(previewDocId, page, xPct, yPct)}
                onStampRemove={(page) => removePageStamp(previewDocId, page)}
                signerLabel={
                  certRef.current ? getCertificateHolderLabel(certRef.current) : ""
                }
                stampSubject={certLabel || certPreview.subject || null}
                stampCnpj={getCertificateHolderCnpj(certPreview)}
                stampCpf={formatCpf(certPreview.icpBrasil.cpf)}
                stampRazaoSocial={certPreview.icpBrasil.razaoSocial || null}
                stampResponsavel={certPreview.icpBrasil.responsavel || null}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep("pages")}
                  style={{
                    background: "transparent",
                    color: "#cbd5e1",
                    border: "1px solid #475569",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Voltar para posicionar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void iniciarEAssinar()}
                  style={{
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
              </div>
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
                  <li key={r.documentId} style={{ marginBottom: 10 }}>
                    {r.documentId.slice(0, 8)}…{" "}
                    {r.ok ? (
                      <>
                        OK
                        {r.code ? (
                          <>
                            {" — "}
                            <a
                              href={`/api/download/assinatura/${r.code}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#6ee7b7" }}
                            >
                              Baixar PDF assinado
                            </a>
                            {" · "}
                            <a
                              href={`/validar/${r.code}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#7dd3fc" }}
                            >
                              /validar/{r.code}
                            </a>
                          </>
                        ) : r.transactionId ? (
                          <>
                            {" — "}
                            <a
                              href={`/api/admin/documentos/assinaturas-certificado/${r.transactionId}/arquivo?tipo=assinado`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#6ee7b7" }}
                            >
                              Baixar PDF assinado
                            </a>
                          </>
                        ) : null}
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
