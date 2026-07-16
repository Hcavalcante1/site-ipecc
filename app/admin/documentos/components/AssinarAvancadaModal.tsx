"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ADV_CONSENT_TEXT } from "@/lib/documentos/assinaturas/advanced/constants";

type Props = {
  open: boolean;
  onClose: () => void;
  documentId: string | null;
  documentTitle?: string | null;
};

type Step =
  | "identity"
  | "consent"
  | "auth"
  | "done";

/**
 * Fluxo independente de Assinatura Avançada.
 * Não altera o modal da assinatura simples.
 */
export default function AssinarAvancadaModal({
  open,
  onClose,
  documentId,
  documentTitle,
}: Props) {
  const [step, setStep] = useState<Step>("identity");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [identityOk, setIdentityOk] = useState(false);
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
  const [consent, setConsent] = useState(false);
  const [viewed, setViewed] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [validationCode, setValidationCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("identity");
    setErro(null);
    setConsent(false);
    setViewed(false);
    setTransactionId(null);
    setChallengeId(null);
    setPassword("");
    setOtp("");
    setDevCode(null);
    setValidationCode(null);
    void (async () => {
      try {
        const res = await fetch("/api/admin/documentos/identidade-avancada");
        const json = await res.json();
        if (json.identity?.status === "VERIFIED") {
          setIdentityOk(true);
          setFullName(json.identity.fullName || "");
          setCargo(json.identity.cargo || "");
        } else {
          setIdentityOk(false);
        }
      } catch {
        setIdentityOk(false);
      }
    })();
  }, [open, documentId]);

  if (!open || !documentId) return null;

  async function habilitarIdentidade() {
    setBusy(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/documentos/identidade-avancada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          cpf,
          cargo,
          status: "VERIFIED",
          identityLevel: "BASIC",
          emailVerified: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErro(json.error || "Falha ao habilitar identidade.");
        return;
      }
      setIdentityOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function iniciar() {
    if (!documentId) return;
    setBusy(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/documentos/assinaturas-avancadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErro(json.error || "Falha ao criar transação.");
        return;
      }
      setTransactionId(json.transactionId);
      setStep("consent");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function aceitarEAuth() {
    if (!transactionId || !consent || !viewed) return;
    setBusy(true);
    setErro(null);
    try {
      const cRes = await fetch(
        `/api/admin/documentos/assinaturas-avancadas/${transactionId}/consentimento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consentAccepted: true,
            documentViewed: true,
          }),
        }
      );
      const cJson = await cRes.json();
      if (!cRes.ok || !cJson.ok) {
        setErro(cJson.error || "Falha no consentimento.");
        return;
      }
      const mRes = await fetch(
        `/api/admin/documentos/assinaturas-avancadas/${transactionId}/mfa`,
        { method: "POST" }
      );
      const mJson = await mRes.json();
      if (!mRes.ok || !mJson.ok) {
        setErro(mJson.error || "Falha ao enviar MFA.");
        return;
      }
      setChallengeId(mJson.challengeId);
      setDevCode(mJson.devCode || null);
      if (mJson.emailWarning && !mJson.devCode) {
        setErro(String(mJson.emailWarning));
      }
      setStep("auth");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function autorizarEConcluir() {
    if (!transactionId || !challengeId) return;
    setBusy(true);
    setErro(null);
    try {
      const aRes = await fetch(
        `/api/admin/documentos/assinaturas-avancadas/${transactionId}/autorizar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password,
            otpCode: otp,
            challengeId,
          }),
        }
      );
      const aJson = await aRes.json();
      if (!aRes.ok || !aJson.ok) {
        setErro(aJson.error || "Falha na autorização.");
        return;
      }
      const fRes = await fetch(
        `/api/admin/documentos/assinaturas-avancadas/${transactionId}/concluir`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: fullName,
            cpf,
            cargo,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        }
      );
      const fJson = await fRes.json();
      if (!fRes.ok || !fJson.ok) {
        setErro(fJson.error || "Falha ao concluir.");
        return;
      }
      setValidationCode(fJson.validationCode || null);
      setStep("done");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle: CSSProperties = {
    display: "block",
    width: "100%",
    marginTop: 4,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #475569",
    background: "#1e293b",
    color: "#f8fafc",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.72)",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
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
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "1px solid #334155",
          }}
        >
          <strong>Assinatura eletrônica avançada</strong>
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
          {documentTitle ? (
            <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 0 }}>
              {documentTitle}
            </p>
          ) : null}
          <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.45 }}>
            Exige identidade habilitada, reautenticação, MFA e gera certificado
            de evidências.{" "}
            <strong>Não equivale a assinatura qualificada ICP-Brasil.</strong>
          </p>

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

          {step === "identity" ? (
            <>
              {identityOk ? (
                <>
                  <p style={{ fontSize: 14, color: "#6ee7b7" }}>
                    Identidade habilitada. Pode iniciar a transação.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void iniciar()}
                    style={{
                      marginTop: 12,
                      background: "#0f766e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {busy ? "Criando…" : "Iniciar assinatura avançada"}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 14 }}>
                    Habilite sua identidade (nível BASIC / VERIFIED interno).
                  </p>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                    Nome completo
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={fieldStyle}
                    />
                  </label>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                    CPF
                    <input
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      style={fieldStyle}
                    />
                  </label>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                    Cargo
                    <input
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      style={fieldStyle}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || fullName.length < 3 || cpf.replace(/\D/g, "").length !== 11}
                    onClick={() => void habilitarIdentidade()}
                    style={{
                      marginTop: 8,
                      background: "#0f766e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {busy ? "Salvando…" : "Habilitar identidade"}
                  </button>
                </>
              )}
            </>
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
                  marginBottom: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={viewed}
                  onChange={(e) => setViewed(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>Declaro que visualizei o documento apresentado.</span>
              </label>
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
                <span>{ADV_CONSENT_TEXT}</span>
              </label>
              <button
                type="button"
                disabled={!consent || !viewed || busy}
                onClick={() => void aceitarEAuth()}
                style={{
                  marginTop: 16,
                  background: consent && viewed ? "#0f766e" : "#475569",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontWeight: 600,
                  cursor: consent && viewed && !busy ? "pointer" : "not-allowed",
                }}
              >
                {busy ? "Enviando MFA…" : "Aceitar e receber MFA"}
              </button>
            </>
          ) : null}

          {step === "auth" ? (
            <>
              <p style={{ fontSize: 14, color: "#94a3b8" }}>
                Reautenticação (senha) + MFA (OTP). Desafio válido por 5 minutos.
              </p>
              {devCode ? (
                <p style={{ fontSize: 13, color: "#fbbf24" }}>
                  Código MFA: <strong>{devCode}</strong>
                </p>
              ) : null}
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                CPF (carimbo)
                <input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Código MFA
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={fieldStyle}
                />
              </label>
              <button
                type="button"
                disabled={busy || !password || !otp}
                onClick={() => void autorizarEConcluir()}
                style={{
                  marginTop: 12,
                  background: "#0f766e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {busy ? "Concluindo…" : "Autorizar e assinar"}
              </button>
            </>
          ) : null}

          {step === "done" ? (
            <>
              <p style={{ color: "#6ee7b7", fontWeight: 600 }}>
                Assinatura avançada concluída.
              </p>
              {validationCode ? (
                <p style={{ fontSize: 14 }}>
                  Código:{" "}
                  <a
                    href={`/validar/${validationCode}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#5eead4" }}
                  >
                    {validationCode}
                  </a>
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
