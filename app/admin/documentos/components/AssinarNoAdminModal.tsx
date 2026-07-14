"use client";

import { useEffect, useState } from "react";
import { CONSENTIMENTO_ASSINATURA_IPECC } from "@/lib/documentos/signing/constants";

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
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
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
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmar() {
    if ((!signatureDocumentId && !batchId) || !challengeId) return;
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
          cpf: cpf || undefined,
          cargo: cargo || undefined,
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
                  Digite sua senha do admin e o código enviado por e-mail.
                </p>
                {devCode ? (
                  <p style={{ fontSize: 13, color: "#fbbf24" }}>
                    Ambiente local sem Resend — código OTP: <strong>{devCode}</strong>
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
                  CPF (opcional)
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
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
                  Cargo (opcional)
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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button
                    type="button"
                    disabled={busy || password.length < 4 || otp.length !== 6}
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
