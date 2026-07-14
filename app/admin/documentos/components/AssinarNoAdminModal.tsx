"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CONSENTIMENTO_ASSINATURA_IPECC } from "@/lib/documentos/signing/constants";

/** Proporções do selo compacto (iguais ao PDF). A4 595×842 pt. */
const PREVIEW_PAGE = { w: 595, h: 842, margin: 18 };
const PREVIEW_SELO = { w: 216, h: 36 };

function StampPositionPreview({
  xPct,
  yPct,
  onChange,
  nome,
}: {
  xPct: number;
  yPct: number;
  onChange: (x: number, y: number) => void;
  nome: string;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const spanX = PREVIEW_PAGE.w - PREVIEW_SELO.w - 2 * PREVIEW_PAGE.margin;
  const spanY = PREVIEW_PAGE.h - PREVIEW_SELO.h - 2 * PREVIEW_PAGE.margin;
  const leftPt = PREVIEW_PAGE.margin + (spanX * xPct) / 100;
  const topPt = PREVIEW_PAGE.margin + (spanY * yPct) / 100;

  function pctFromClient(clientX: number, clientY: number) {
    const el = pageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const relX = ((clientX - r.left) / r.width) * PREVIEW_PAGE.w;
    const relY = ((clientY - r.top) / r.height) * PREVIEW_PAGE.h;
    // âncora = canto superior esquerdo do selo; clicar no centro do selo também
    const x = Math.min(
      100,
      Math.max(
        0,
        ((relX - PREVIEW_SELO.w / 2 - PREVIEW_PAGE.margin) / spanX) * 100
      )
    );
    const y = Math.min(
      100,
      Math.max(
        0,
        ((relY - PREVIEW_SELO.h / 2 - PREVIEW_PAGE.margin) / spanY) * 100
      )
    );
    onChange(Math.round(x), Math.round(y));
  }

  function onPointerDown(e: ReactPointerEvent) {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pctFromClient(e.clientX, e.clientY);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragging.current) return;
    pctFromClient(e.clientX, e.clientY);
  }

  function onPointerUp() {
    dragging.current = false;
  }

  const label = (nome.trim() || "NOME").toUpperCase().slice(0, 18);

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
        Prévia: clique ou arraste o carimbo na página para posicionar.
      </p>
      <div
        ref={pageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 220,
          aspectRatio: `${PREVIEW_PAGE.w} / ${PREVIEW_PAGE.h}`,
          margin: "0 auto",
          background: "#f8fafc",
          border: "1px solid #64748b",
          borderRadius: 4,
          cursor: "crosshair",
          touchAction: "none",
          userSelect: "none",
          boxShadow: "inset 0 0 0 1px #e2e8f0",
        }}
        title="Clique ou arraste para posicionar"
      >
        <div
          style={{
            position: "absolute",
            left: `${(leftPt / PREVIEW_PAGE.w) * 100}%`,
            top: `${(topPt / PREVIEW_PAGE.h) * 100}%`,
            width: `${(PREVIEW_SELO.w / PREVIEW_PAGE.w) * 100}%`,
            height: `${(PREVIEW_SELO.h / PREVIEW_PAGE.h) * 100}%`,
            background: "rgba(224, 242, 254, 0.95)",
            border: "1px solid #0ea5e9",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "1px 2px",
            boxSizing: "border-box",
            pointerEvents: "none",
            boxShadow: "0 1px 4px rgba(14,165,233,0.35)",
          }}
        >
          <div
            style={{
              width: "16%",
              aspectRatio: "1",
              background: "#0059bf",
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 5,
              lineHeight: 1.15,
              color: "#0f172a",
              overflow: "hidden",
            }}
          >
            <div style={{ opacity: 0.7 }}>Assinado digitalmente</div>
            <div style={{ fontWeight: 700, fontSize: 5.5 }}>{label}</div>
          </div>
          <div
            style={{
              width: "16%",
              aspectRatio: "1",
              background:
                "repeating-conic-gradient(#0059bf 0% 25%, #e0f2fe 0% 50%) 50% / 40% 40%",
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
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
  }, [open, signatureDocumentId, batchId]);

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
          width: "min(560px, 100%)",
          maxHeight: "92vh",
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
                  Posição livre na página. Arraste na prévia ou use os controles.
                </p>
                <StampPositionPreview
                  xPct={xPct}
                  yPct={yPct}
                  nome={nome}
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
