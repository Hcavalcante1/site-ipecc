"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CONSENTIMENTO_ASSINATURA_IPECC } from "@/lib/documentos/signing/constants";

/** Mesmas proporções do carimbo no PDF (pt) — ver seloBoxPts(). */
const STAMP_MARGIN = 18;
const STAMP_BOX = { w: 232, h: 40 };
const LOGO_PREVIEW = "/media/global/logos/ipecc_logo_v2.png";

function formatarCpfPreview(cpf: string): string {
  const d = String(cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return d || "000.000.000-00";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatarDataPreview(): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toLocaleString("pt-BR");
  }
}

/** Mesma matemática de `origemLivre` no pdfStampService (âncora canto SE, y 0=topo). */
function stampLeftTopPct(
  pageW: number,
  pageH: number,
  xPct: number,
  yPct: number
): { leftPct: number; topPct: number; wPct: number; hPct: number } {
  const margin = STAMP_MARGIN;
  const boxW = STAMP_BOX.w;
  const boxH = STAMP_BOX.h;
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

/**
 * Página real via pdf.js (1:1 com o PDF) + carimbo na mesma posição da assinatura.
 */
function StampPositionPreview({
  documentId,
  xPct,
  yPct,
  onChange,
  nome,
  cpf,
  cargo,
  modoPagina,
  paginaNum,
}: {
  documentId?: string | null;
  xPct: number;
  yPct: number;
  onChange: (x: number, y: number) => void;
  nome: string;
  cpf: string;
  cargo: string;
  modoPagina: "ultima" | "numero" | "nova";
  paginaNum: string;
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
    if (!pdfUrl || modoPagina === "nova") {
      setPageSize({ w: 595.28, h: 841.89 });
      setPageLabel(modoPagina === "nova" ? "Nova folha" : "");
      setLoadErro(null);
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

        let pageIndex = doc.numPages;
        if (modoPagina === "numero") {
          const n = Math.min(
            Math.max(Number(paginaNum) || 1, 1),
            doc.numPages
          );
          pageIndex = n;
        }
        const page = await doc.getPage(pageIndex);
        const base = page.getViewport({ scale: 1 });
        const targetW = Math.min(
          900,
          wrapRef.current?.clientWidth || 720
        );
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
  }, [pdfUrl, modoPagina, paginaNum]);

  const geom = stampLeftTopPct(pageSize.w, pageSize.h, xPct, yPct);

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
    const margin = STAMP_MARGIN;
    const spanX = Math.max(0, pageW - STAMP_BOX.w - 2 * margin);
    const spanY = Math.max(0, pageH - STAMP_BOX.h - 2 * margin);
    const relX = ((clientX - r.left) / r.width) * pageW;
    const relY = ((clientY - r.top) / r.height) * pageH;
    const x = Math.min(
      100,
      Math.max(0, ((relX - STAMP_BOX.w / 2 - margin) / spanX) * 100)
    );
    const y = Math.min(
      100,
      Math.max(0, ((relY - STAMP_BOX.h / 2 - margin) / spanY) * 100)
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

  const nomeShow = (nome.trim() || "SEU NOME").toUpperCase();
  const cpfShow = formatarCpfPreview(cpf);
  const cargoShow = cargo.trim();
  const dataShow = formatarDataPreview();
  const metaLinha = cargoShow
    ? `${cargoShow} · CPF ${cpfShow}`
    : `CPF ${cpfShow}`;

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
        Posição 1:1 com o PDF
        {pageLabel ? ` · ${pageLabel}` : ""}. Role a página e arraste o carimbo
        (mãozinha) — ele acompanha a rolagem e fica onde você soltar.
      </p>
      {loadErro ? (
        <p style={{ color: "#fca5a5", fontSize: 13 }}>{loadErro}</p>
      ) : null}
      <div
        ref={scrollRef}
        style={{
          borderRadius: 8,
          overflow: "auto",
          maxHeight: "min(62vh, 640px)",
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
          {modoPagina === "nova" ? (
            <div
              style={{
                width: "100%",
                aspectRatio: `${pageSize.w} / ${pageSize.h}`,
                background: "#fff",
                minHeight: 360,
              }}
            />
          ) : (
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
          )}
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
          {/* Sobre a página: rola junto com o PDF */}
          <div
            role="button"
            aria-label="Arrastar carimbo de assinatura"
            title="Arraste — acompanha a rolagem; posição = PDF assinado"
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
              background: "rgba(245, 250, 255, 0.97)",
              border: "1px solid #c5ced8",
              borderRadius: 2,
              display: "grid",
              gridTemplateColumns: "1fr 3.4fr 1fr",
              alignItems: "center",
              columnGap: 6,
              padding: "5px 5px",
              boxSizing: "border-box",
              cursor: grabbing ? "grabbing" : "grab",
              boxShadow: "0 2px 8px rgba(2,132,199,0.4)",
              zIndex: 3,
              touchAction: "none",
            }}
          >
            <img
              src={LOGO_PREVIEW}
              alt="IPECC"
              draggable={false}
              style={{
                width: "100%",
                aspectRatio: "1",
                objectFit: "contain",
                objectPosition: "center",
                background: "#fff",
                display: "block",
              }}
            />
            <div
              style={{
                minWidth: 0,
                textAlign: "center",
                color: "#1e293b",
                lineHeight: 1.15,
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: "clamp(5px, 1.05vw, 8px)", color: "#475569" }}>
                Documento assinado digitalmente
              </div>
              <div
                style={{
                  fontSize: "clamp(6px, 1.3vw, 10px)",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {nomeShow.slice(0, 28)}
              </div>
              <div style={{ fontSize: "clamp(5px, 0.95vw, 8px)", color: "#475569" }}>
                Data: {dataShow}
              </div>
              <div style={{ fontSize: "clamp(5px, 0.95vw, 7.5px)", color: "#475569" }}>
                {metaLinha.slice(0, 36)}
              </div>
              <div style={{ fontSize: "clamp(4.5px, 0.9vw, 7px)", color: "#0059bf" }}>
                Lei 14.063/2020 · (código na assinatura)
              </div>
            </div>
            <div
              aria-hidden
              style={{
                width: "100%",
                aspectRatio: "1",
                background:
                  "repeating-conic-gradient(#0059bf 0% 25%, #e8f1fb 0% 50%) 50% / 22% 22%",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  /** Pedido gd_signature_documents.id — motor IPECC */
  signatureDocumentId?: string | null;
  /** Lote gd_signature_batches.id — motor IPECC (1 auth → N docs) */
  batchId?: string | null;
  /** Documento gd_documents.id — preview real do PDF */
  documentId?: string | null;
  /** Legado Documento (iframe) */
  embedUrl?: string | null;
  signingUrl?: string | null;
  title?: string;
  documentTitle?: string;
  onClose: () => void;
  onCompleted?: () => void;
};

type Step = "consent" | "auth" | "done";

/**
 * Modal de assinatura no admin.
 * Preferência: motor IPECC (consentimento + senha + OTP).
 * Fallback: iframe do motor Documento legado.
 */
export default function AssinarNoAdminModal({
  open,
  signatureDocumentId,
  batchId,
  documentId,
  embedUrl,
  signingUrl,
  title = "Assinar documento",
  documentTitle,
  onClose,
  onCompleted,
}: Props) {
  const useIpecc = Boolean(signatureDocumentId || batchId);
  const [step, setStep] = useState<Step>("consent");
  const [consent, setConsent] = useState(false);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
  const [modoPagina, setModoPagina] = useState<"ultima" | "numero" | "nova">(
    "ultima"
  );
  const [paginaNum, setPaginaNum] = useState("1");
  const [posicao, setPosicao] = useState<"esquerda" | "centro" | "direita">(
    "direita"
  );
  const [zona, setZona] = useState<"topo" | "meio" | "rodape">("rodape");
  /** 0–100: esquerda→direita / topo→rodapé (posição livre na página). */
  const [xPct, setXPct] = useState(96);
  const [yPct, setYPct] = useState(96);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [validationCode, setValidationCode] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("consent");
    setConsent(false);
    setPassword("");
    setOtp("");
    setChallengeId(null);
    setDevCode(null);
    setEmailWarning(null);
    setNome("");
    setCpf("");
    setCargo("");
    setModoPagina("ultima");
    setPaginaNum("1");
    setPosicao("direita");
    setZona("rodape");
    setXPct(96);
    setYPct(96);
    setErro(null);
    setValidationCode(null);
    setProgressMsg(null);
    setBusy(false);
  }, [open, signatureDocumentId, batchId, documentId]);

  if (!open) return null;

  const clientMeta = () => ({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution:
      typeof window !== "undefined"
        ? `${window.screen.width}x${window.screen.height}`
        : undefined,
  });

  async function iniciar() {
    if ((!signatureDocumentId && !batchId) || !consent) return;
    setBusy(true);
    setErro(null);
    try {
      const url = batchId
        ? `/api/admin/documentos/lotes/${batchId}/ipecc/iniciar`
        : `/api/admin/documentos/assinaturas/${signatureDocumentId}/ipecc/iniciar`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentAccepted: true,
          ...clientMeta(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErro(json.error || "Não foi possível iniciar a assinatura.");
        return;
      }
      setChallengeId(json.challengeId);
      setDevCode(json.devCode || null);
      setEmailWarning(json.emailWarning || null);
      if (json.total) {
        setProgressMsg(`${json.total} documento(s) no lote.`);
      }
      setStep("auth");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function reenviarOtp() {
    if (batchId) {
      await iniciar();
      return;
    }
    if (!signatureDocumentId) return;
    setBusy(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/admin/documentos/assinaturas/${signatureDocumentId}/ipecc/otp`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErro(json.error || "Falha ao reenviar OTP.");
        return;
      }
      setChallengeId(json.challengeId);
      setDevCode(json.devCode || null);
      setEmailWarning(json.emailWarning || null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmar() {
    if ((!signatureDocumentId && !batchId) || !challengeId) return;
    if (!nome.trim() || nome.trim().length < 3) {
      setErro("Informe o nome completo de quem assina.");
      return;
    }
    if (!/^\d{11}$/.test(cpf.replace(/\D/g, ""))) {
      setErro("Informe o CPF com 11 dígitos.");
      return;
    }
    setBusy(true);
    setErro(null);
    try {
      const url = batchId
        ? `/api/admin/documentos/lotes/${batchId}/ipecc/confirmar`
        : `/api/admin/documentos/assinaturas/${signatureDocumentId}/ipecc/confirmar`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          otpCode: otp,
          challengeId,
          consentAccepted: true,
          nome: nome.trim(),
          cpf: cpf.replace(/\D/g, ""),
          cargo: cargo.trim() || undefined,
          placement: {
            modoPagina,
            pagina:
              modoPagina === "numero"
                ? Number(paginaNum) || 1
                : undefined,
            posicao,
            zona,
            xPct,
            yPct,
          },
          ...clientMeta(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErro(json.error || "Não foi possível concluir a assinatura.");
        return;
      }
      if (batchId) {
        setProgressMsg(
          `Concluído: ${json.progressDone}/${json.progressTotal}` +
            (json.falhas?.length
              ? ` · ${json.falhas.length} falha(s)`
              : "")
        );
        setValidationCode(null);
      } else {
        setValidationCode(json.validationCode);
      }
      setStep("done");
      onCompleted?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  const src = embedUrl || signingUrl || "";
  const modalWide = useIpecc && step === "auth";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(15, 23, 42, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: modalWide ? "min(960px, 100%)" : "min(560px, 100%)",
          maxHeight: "94vh",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid #334155",
          }}
        >
          <strong style={{ color: "#f8fafc" }}>{title}</strong>
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

        {useIpecc ? (
          <div style={{ padding: 20, color: "#e2e8f0", overflow: "auto" }}>
            {documentTitle ? (
              <p style={{ marginTop: 0, color: "#94a3b8", fontSize: 14 }}>
                {documentTitle}
              </p>
            ) : null}
            {progressMsg ? (
              <p style={{ color: "#93c5fd", fontSize: 14 }}>{progressMsg}</p>
            ) : null}

            {erro ? (
              <p
                style={{
                  background: "#7f1d1d",
                  color: "#fecaca",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                {erro}
              </p>
            ) : null}

            {step === "consent" ? (
              <>
                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>{CONSENTIMENTO_ASSINATURA_IPECC}</span>
                </label>
                <button
                  type="button"
                  disabled={!consent || busy}
                  onClick={() => void iniciar()}
                  style={{
                    marginTop: 18,
                    background: consent ? "#0f766e" : "#475569",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 14px",
                    cursor: consent && !busy ? "pointer" : "not-allowed",
                    fontWeight: 600,
                  }}
                >
                  {busy ? "Enviando código…" : "Continuar e receber OTP"}
                </button>
              </>
            ) : null}

            {step === "auth" ? (
              <>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>
                  Digite sua senha do admin e o código OTP.
                </p>
                {emailWarning ? (
                  <p style={{ fontSize: 13, color: "#fbbf24", marginBottom: 8 }}>
                    E-mail OTP indisponível no momento
                    {emailWarning.includes("domain") ||
                    emailWarning.includes("domínio") ||
                    /not verified/i.test(emailWarning)
                      ? " (domínio Resend não verificado)"
                      : ""}
                    . Use o código abaixo.
                  </p>
                ) : null}
                {devCode ? (
                  <p style={{ fontSize: 13, color: "#fbbf24" }}>
                    Código OTP: <strong>{devCode}</strong>
                  </p>
                ) : null}
                <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                  Senha
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #475569",
                      background: "#1e293b",
                      color: "#f8fafc",
                    }}
                  />
                </label>
                <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                  Código OTP (6 dígitos)
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #475569",
                      background: "#1e293b",
                      color: "#f8fafc",
                      letterSpacing: 4,
                    }}
                  />
                </label>
                <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                  Nome completo (obrigatório)
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Helio Cavalcante"
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #475569",
                      background: "#1e293b",
                      color: "#f8fafc",
                    }}
                  />
                </label>
                <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                  CPF (obrigatório — vai no carimbo)
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) =>
                      setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="Somente números"
                    inputMode="numeric"
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #475569",
                      background: "#1e293b",
                      color: "#f8fafc",
                    }}
                  />
                </label>
                <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                  Cargo
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ex.: Presidente"
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #475569",
                      background: "#1e293b",
                      color: "#f8fafc",
                    }}
                  />
                </label>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "12px 0 6px" }}>
                  Posição do selo no PDF (modelo gov.br — em qualquer parte da página)
                </p>
                <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                  Página
                  <select
                    value={modoPagina}
                    onChange={(e) =>
                      setModoPagina(
                        e.target.value as "ultima" | "numero" | "nova"
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #475569",
                      background: "#1e293b",
                      color: "#f8fafc",
                    }}
                  >
                    <option value="ultima">Última página do documento</option>
                    <option value="numero">Página específica</option>
                    <option value="nova">Nova folha de assinatura</option>
                  </select>
                </label>
                {modoPagina === "numero" ? (
                  <label
                    style={{ display: "block", fontSize: 13, marginBottom: 8 }}
                  >
                    Número da página
                    <input
                      type="number"
                      min={1}
                      value={paginaNum}
                      onChange={(e) => setPaginaNum(e.target.value)}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 4,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #475569",
                        background: "#1e293b",
                        color: "#f8fafc",
                      }}
                    />
                  </label>
                ) : null}
                <p
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    margin: "0 0 8px",
                    lineHeight: 1.4,
                  }}
                >
                  Posicione o carimbo no documento (mãozinha). Atalhos e % ajustam fino.
                </p>
                <StampPositionPreview
                  documentId={documentId}
                  xPct={xPct}
                  yPct={yPct}
                  nome={nome}
                  cpf={cpf}
                  cargo={cargo}
                  modoPagina={modoPagina}
                  paginaNum={paginaNum}
                  onChange={(x, y) => {
                    setXPct(x);
                    setYPct(y);
                  }}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <label style={{ display: "block", fontSize: 13 }}>
                    Área vertical
                    <select
                      value={zona}
                      onChange={(e) => {
                        const z = e.target.value as "topo" | "meio" | "rodape";
                        setZona(z);
                        setYPct(z === "topo" ? 4 : z === "meio" ? 50 : 96);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 4,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #475569",
                        background: "#1e293b",
                        color: "#f8fafc",
                      }}
                    >
                      <option value="topo">Topo</option>
                      <option value="meio">Meio</option>
                      <option value="rodape">Rodapé</option>
                    </select>
                  </label>
                  <label style={{ display: "block", fontSize: 13 }}>
                    Lado
                    <select
                      value={posicao}
                      onChange={(e) => {
                        const p = e.target.value as
                          | "esquerda"
                          | "centro"
                          | "direita";
                        setPosicao(p);
                        setXPct(
                          p === "esquerda" ? 0 : p === "centro" ? 50 : 100
                        );
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 4,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #475569",
                        background: "#1e293b",
                        color: "#f8fafc",
                      }}
                    >
                      <option value="direita">Direita</option>
                      <option value="centro">Centro</option>
                      <option value="esquerda">Esquerda</option>
                    </select>
                  </label>
                </div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                  Horizontal: {xPct}% (0 esquerda · 100 direita)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={xPct}
                    onChange={(e) => setXPct(Number(e.target.value))}
                    style={{ display: "block", width: "100%", marginTop: 6 }}
                  />
                </label>
                <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                  Vertical: {yPct}% (0 topo · 100 rodapé)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={yPct}
                    onChange={(e) => setYPct(Number(e.target.value))}
                    style={{ display: "block", width: "100%", marginTop: 6 }}
                  />
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      password.length < 4 ||
                      otp.length !== 6 ||
                      nome.trim().length < 3 ||
                      cpf.replace(/\D/g, "").length !== 11
                    }
                    onClick={() => void confirmar()}
                    style={{
                      background: "#0f766e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 14px",
                      cursor: busy ? "not-allowed" : "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {busy ? "Assinando…" : "Confirmar assinatura"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void reenviarOtp()}
                    style={{
                      background: "#334155",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Reenviar OTP
                  </button>
                </div>
              </>
            ) : null}

            {step === "done" ? (
              <>
                <p style={{ color: "#6ee7b7", fontWeight: 600 }}>
                  Assinatura registrada com sucesso.
                </p>
                {validationCode ? (
                  <p style={{ fontSize: 14 }}>
                    Código de validação:{" "}
                    <strong style={{ letterSpacing: 1 }}>{validationCode}</strong>
                    <br />
                    <a
                      href={`/validar/${validationCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#93c5fd" }}
                    >
                      Abrir página pública de validação
                    </a>
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    marginTop: 8,
                    background: "#0f766e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Fechar
                </button>
              </>
            ) : null}
          </div>
        ) : src ? (
          <>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                padding: "8px 16px",
                borderBottom: "1px solid #334155",
              }}
            >
              {signingUrl ? (
                <a
                  href={signingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#93c5fd", fontSize: 13, alignSelf: "center" }}
                >
                  Abrir em nova aba
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onCompleted?.();
                  onClose();
                }}
                style={{
                  background: "#0f766e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Concluí — atualizar
              </button>
            </div>
            <iframe
              title={title}
              src={src}
              style={{
                width: "100%",
                height: "min(78vh, 720px)",
                border: "none",
                background: "#fff",
              }}
              allow="clipboard-write"
            />
          </>
        ) : (
          <p style={{ padding: 24, color: "#fca5a5" }}>
            Informe o pedido de assinatura IPECC ou um link do motor legado.
          </p>
        )}
      </div>
    </div>
  );
}
