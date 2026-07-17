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
  onCompleted?: () => void;
};

type SessionItem = {
  itemId: string | null;
  transactionId: string;
  documentId: string;
  documentHashSha256: string;
  downloadPath: string;
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

type Placement = { page: number; xPct: number; yPct: number };

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
          gap: 1,
          alignItems: "center",
          width: "fit-content",
          maxWidth: "100%",
        }}
      >
      <div
        style={{
          minWidth: 0,
          flex: "0 1 auto",
          maxWidth: 150,
          fontSize: 6.6,
          lineHeight: 1.02,
          fontFamily: "Helvetica, Arial, sans-serif",
          color: "#000",
        }}
      >
        <div style={{ fontSize: 6.2, fontWeight: 700, lineHeight: 1.01 }}>Assinado digitalmente por</div>
        <div style={{ marginTop: 1, fontWeight: 700, fontSize: 6.9, lineHeight: 1.01, wordBreak: "break-word" }}>
          {label.toUpperCase()}
        </div>
        <div style={{ marginTop: 0, fontWeight: 400 }}>CNPJ: {cnpj || ""}</div>
        <div style={{ marginTop: 0, fontWeight: 400, wordBreak: "break-word" }}>
          {[cert.icpBrasil.razaoSocial ? `Razão social: ${cert.icpBrasil.razaoSocial}` : null, cert.icpBrasil.responsavel ? `Responsável: ${cert.icpBrasil.responsavel}` : null]
            .filter(Boolean)
            .join(" • ")}
        </div>
        <div style={{ marginTop: 0, fontWeight: 400 }}>CPF: {cpf || ""}</div>
        <div style={{ marginTop: 0, fontWeight: 400 }}>Dados: {when}</div>
      </div>
      <div
        style={{
          width: 52,
          minWidth: 52,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 1,
          fontSize: 5.0,
          lineHeight: 1.02,
          fontFamily: "Helvetica, Arial, sans-serif",
          color: "#000",
        }}
      >
        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ fontWeight: 700, lineHeight: 1.01 }}>VALIDAR ITI</div>
          <div style={{ lineHeight: 1.01 }}>verifique em validar.iti.gov.br</div>
        </div>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR Code de validação"
            style={{ width: 22, height: 22, display: "block", flex: "0 0 auto" }}
          />
        ) : (
          <div
            style={{
              width: 22,
              height: 22,
              border: "1px solid #94a3b8",
              background: "#f8fafc",
              flex: "0 0 auto",
            }}
          />
        )}
      </div>
    </div>
  );
}

function CertStampPositionPreview({
  documentId,
  placement,
  onChange,
  signerLabel,
  stampSubject,
  stampCnpj,
  stampCpf,
  stampRazaoSocial,
  stampResponsavel,
}: {
  documentId?: string | null;
  placement: Placement;
  onChange: (next: Placement) => void;
  signerLabel: string;
  stampSubject?: string | null;
  stampCnpj?: string | null;
  stampCpf?: string | null;
  stampRazaoSocial?: string | null;
  stampResponsavel?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragging = useRef(false);
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

  const activePage =
    pages.find((p) => p.index === placement.page) || pages[pages.length - 1];
  const pageW = activePage?.w || 595.28;
  const pageH = activePage?.h || 841.89;
  const geom = stampLeftTopPct(
    pageW,
    pageH,
    CERT_STAMP_BOX.w,
    CERT_STAMP_BOX.h,
    placement.xPct,
    placement.yPct
  );

  function autoScrollSeBorda(clientY: number) {
    const sc = scrollRef.current;
    if (!sc) return;
    const r = sc.getBoundingClientRect();
    const zona = 48;
    if (clientY > r.bottom - zona) sc.scrollTop += 22;
    else if (clientY < r.top + zona) sc.scrollTop -= 22;
  }

  function placementFromClient(clientX: number, clientY: number) {
    autoScrollSeBorda(clientY);
    let hitIdx = -1;
    for (let i = 0; i < pageRefs.current.length; i++) {
      const el = pageRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx < 0) {
      // Fora das páginas: escolhe a mais próxima pelo centro
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const mid = (r.top + r.bottom) / 2;
        const d = Math.abs(clientY - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      hitIdx = best;
    }
    const el = pageRefs.current[hitIdx];
    const meta = pages[hitIdx];
    if (!el || !meta) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const margin = CERT_STAMP_BOX.margin;
    const boxW = CERT_STAMP_BOX.w;
    const boxH = CERT_STAMP_BOX.h;
    const spanX = Math.max(0, meta.w - boxW - 2 * margin);
    const spanY = Math.max(0, meta.h - boxH - 2 * margin);
    const relX = ((clientX - r.left) / r.width) * meta.w;
    const relY = ((clientY - r.top) / r.height) * meta.h;
    const x = Math.min(
      100,
      Math.max(0, ((relX - boxW / 2 - margin) / Math.max(spanX, 1)) * 100)
    );
    const y = Math.min(
      100,
      Math.max(0, ((relY - boxH / 2 - margin) / Math.max(spanY, 1)) * 100)
    );
    onChange({
      page: meta.index,
      xPct: Math.round(x),
      yPct: Math.round(y),
    });
  }

  function onPointerDown(e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    setGrabbing(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    placementFromClient(e.clientX, e.clientY);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragging.current) return;
    placementFromClient(e.clientX, e.clientY);
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

  const when = (() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const tzMin = -now.getTimezoneOffset();
    const tzSign = tzMin >= 0 ? "+" : "-";
    const tzAbs = Math.abs(tzMin);
    const tz = `${tzSign}${pad(Math.floor(tzAbs / 60))}:${pad(tzAbs % 60)}`;
    return `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${tz}`;
  })();

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
        Role o documento e arraste o carimbo para qualquer lugar (posição
        livre).
        {pages.length
          ? ` · Página atual do carimbo: ${placement.page} de ${pages.length}`
          : ""}
      </p>
      {loadErro ? (
        <p style={{ color: "#fca5a5", fontSize: 13 }}>{loadErro}</p>
      ) : null}
      <div
        ref={scrollRef}
        style={{
          borderRadius: 8,
          overflow: "auto",
          maxHeight: "min(62vh, 680px)",
          border: "1px solid #334155",
          background: "#334155",
          padding: 8,
        }}
      >
        {loadingPdf ? (
          <p style={{ color: "#f8fafc", fontSize: 13, padding: 16 }}>
            Carregando documento…
          </p>
        ) : null}
        {pages.map((p, idx) => {
          const isActive = p.index === placement.page;
          const g = isActive
            ? geom
            : stampLeftTopPct(
                p.w,
                p.h,
                CERT_STAMP_BOX.w,
                CERT_STAMP_BOX.h,
                placement.xPct,
                placement.yPct
              );
          return (
            <div
              key={p.index}
              ref={(el) => {
                pageRefs.current[idx] = el;
              }}
              style={{
                position: "relative",
                width: "100%",
                lineHeight: 0,
                background: "#fff",
                marginBottom: 10,
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }}
              onPointerDown={(e) => {
                // Clique na página também posiciona o carimbo
                if ((e.target as HTMLElement).closest("[data-stamp]")) return;
                placementFromClient(e.clientX, e.clientY);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.dataUrl}
                alt={`Página ${p.index}`}
                draggable={false}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
              {isActive ? (
                <div
                  data-stamp="1"
                  role="button"
                  aria-label="Arrastar carimbo de assinatura"
                  title="Arraste livremente pelo documento"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  style={{
                    position: "absolute",
                    left: `${g.leftPct}%`,
                    top: `${g.topPct}%`,
                    width: `${g.wPct}%`,
                    height: `${g.hPct}%`,
                    background: "#ffffff",
                    border: "none",
                    borderRadius: 0,
                    boxSizing: "border-box",
                    cursor: grabbing ? "grabbing" : "grab",
                    boxShadow: "none",
                    outline: grabbing ? "1px dashed #999" : "1px dashed transparent",
                    zIndex: 3,
                    touchAction: "none",
                    padding: "6px 8px",
                    display: "flex",
                    gap: 4,
                    overflow: "hidden",
                    alignItems: "stretch",
                    minHeight: 84,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "flex-start",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 6.6,
                      lineHeight: 1.05,
                      fontFamily: "Helvetica, Arial, sans-serif",
                      color: "#000",
                      position: "relative",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "0 1 auto", maxWidth: 170 }}>
                      <div style={{ fontSize: 6.6, fontWeight: 700, lineHeight: 1.04 }}>
                        Assinado digitalmente por
                      </div>
                      <div style={{ marginTop: 2, fontSize: 7, fontWeight: 700, wordBreak: "break-word", lineHeight: 1.04 }}>
                        {String(stampSubject || signerLabel).toUpperCase() || "TITULAR DO CERTIFICADO"}
                      </div>
                      <div style={{ marginTop: 0, fontWeight: 400 }}>
                        CNPJ: {stampCnpj || ""}
                      </div>
                      <div style={{ marginTop: 1, wordBreak: "break-word" }}>
                        {[stampRazaoSocial ? `Razão social: ${stampRazaoSocial}` : null, stampResponsavel ? `Responsável: ${stampResponsavel}` : null]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                      <div style={{ marginTop: 1, wordBreak: "break-word" }}>
                        {stampCpf ? `CPF: ${stampCpf}` : ""}
                      </div>
                      <div style={{ marginTop: 1 }}>Dados: {when}</div>
                    </div>
                    <div style={{ display: "flex", gap: 2, alignItems: "center", justifyContent: "flex-start", flex: "0 0 auto" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, lineHeight: 1.02 }}>VALIDAR ITI</div>
                        <div style={{ lineHeight: 1.02 }}>verificar em validar.iti.gov.br</div>
                      </div>
                      {qrDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qrDataUrl}
                          alt="QR Code de validação"
                          style={{ width: 20, height: 20, display: "block", flex: "0 0 auto" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            border: "1px solid #94a3b8",
                            background: "#f8fafc",
                            flex: "0 0 auto",
                          }}
                        />
                      )}
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
  const [placement, setPlacement] = useState<Placement>({
    page: 1,
    xPct: 96,
    yPct: 96,
  });
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
    setPlacement({ page: 1, xPct: 96, yPct: 96 });
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

          const signed = await signPdfWithLocalCertificate({
            pdfBytes,
            expectedHashSha256: item.documentHashSha256,
            cert,
            appearance: {
              page: placement.page,
              xPct: placement.xPct,
              yPct: placement.yPct,
              width: CERT_STAMP_BOX.w,
              height: CERT_STAMP_BOX.h,
              signerLabel: getCertificateHolderLabel(cert),
            },
          });

          triggerDownload(
            u8ToBlob(signed.signedPdfBytes, "application/pdf"),
            `assinado-${item.documentId.slice(0, 8)}.pdf`
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
              page: placement.page,
              x: placement.xPct,
              y: placement.yPct,
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

          {step === "pages" ? (
            <>
              {certLabel ? (
                <div style={{ color: "#6ee7b7", fontSize: 13, marginBottom: 8, lineHeight: 1.35 }}>
                  <div>
                    Assinando como: <strong>{certLabel}</strong>
                  </div>
                  {certPreview?.icpBrasil.cnpj ? (
                    <div>CNPJ: {getCertificateHolderCnpj(certPreview) || ""}</div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setStep("review")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#7dd3fc",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 13,
                      textDecoration: "underline",
                    }}
                  >
                    ver certificado
                  </button>
                </div>
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

              <CertStampPositionPreview
                documentId={previewDocId}
                placement={placement}
                onChange={setPlacement}
                signerLabel={
                  certRef.current ? getCertificateHolderLabel(certRef.current) : ""
                }
                stampSubject={certLabel || certPreview?.subject || null}
                stampCnpj={certPreview ? getCertificateHolderCnpj(certPreview) : null}
                stampCpf={formatCpf(certPreview?.icpBrasil.cpf)}
                stampRazaoSocial={certPreview?.icpBrasil.razaoSocial || null}
                stampResponsavel={certPreview?.icpBrasil.responsavel || null}
              />

              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                Ajuste a posição antes da prévia final. A posição do carimbo será aplicada
                {documentIds.length > 1
                  ? " a todos os documentos do lote"
                  : " neste documento"}
                .
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={() => setStep("preview")}
                style={{
                  marginTop: 6,
                  background: "#1d4ed8",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Ver prévia final
              </button>
            </>
          ) : null}

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
                placement={placement}
                onChange={setPlacement}
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
