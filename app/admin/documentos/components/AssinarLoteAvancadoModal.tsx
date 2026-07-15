"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ADV_BATCH_CONSENT_TEXT } from "@/lib/documentos/assinaturas/advanced/constants";

type Props = {
  open: boolean;
  onClose: () => void;
  documentIds: string[];
  onCompleted?: () => void;
};

type Step = "identity" | "create" | "consent" | "auth" | "done";

export default function AssinarLoteAvancadoModal({
  open,
  onClose,
  documentIds,
  onCompleted,
}: Props) {
  const [step, setStep] = useState<Step>("identity");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [identityOk, setIdentityOk] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchHash, setBatchHash] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [items, setItems] = useState<
    Array<{ documentId: string; documentHashSha256: string }>
  >([]);
  const [viewed, setViewed] = useState(false);
  const [listOk, setListOk] = useState(false);
  const [consent, setConsent] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
  const [resumo, setResumo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("identity");
    setErro(null);
    setIdentityOk(false);
    setBatchId(null);
    setBatchHash(null);
    setItems([]);
    setViewed(false);
    setListOk(false);
    setConsent(false);
    setChallengeId(null);
    setPassword("");
    setOtp("");
    setDevCode(null);
    setResumo(null);
    void (async () => {
      try {
        const res = await fetch("/api/admin/documentos/identidade-avancada");
        const json = await res.json();
        if (json.identity?.status === "VERIFIED") {
          setIdentityOk(true);
          setNome(json.identity.fullName || "");
          setCargo(json.identity.cargo || "");
          setStep("create");
        } else {
          setIdentityOk(false);
          setStep("identity");
        }
      } catch {
        setIdentityOk(false);
        setStep("identity");
      }
    })();
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

  async function habilitarIdentidade() {
    setBusy(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/documentos/identidade-avancada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: nome,
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
      setStep("create");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function criar() {
    setBusy(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/documentos/lotes-avancados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErro(json.error || "Falha ao criar lote avançado.");
        return;
      }
      setBatchId(json.batchId);
      setBatchHash(json.batchHashSha256);
      setItemCount(json.itemCount);
      setItems(json.items || []);
      setStep("consent");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function consentirEMfa() {
    if (!batchId) return;
    setBusy(true);
    setErro(null);
    try {
      const cRes = await fetch(
        `/api/admin/documentos/lotes-avancados/${batchId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "consentimento",
            consentAccepted: true,
            documentViewed: true,
            listAcknowledged: true,
          }),
        }
      );
      const cJson = await cRes.json();
      if (!cRes.ok || !cJson.ok) {
        setErro(cJson.error || "Falha no consentimento.");
        return;
      }
      const mRes = await fetch(
        `/api/admin/documentos/lotes-avancados/${batchId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mfa" }),
        }
      );
      const mJson = await mRes.json();
      if (!mRes.ok || !mJson.ok) {
        setErro(mJson.error || "Falha no MFA.");
        return;
      }
      setChallengeId(mJson.challengeId);
      setDevCode(mJson.devCode || null);
      setStep("auth");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function autorizarEConcluir() {
    if (!batchId || !challengeId) return;
    setBusy(true);
    setErro(null);
    try {
      const aRes = await fetch(
        `/api/admin/documentos/lotes-avancados/${batchId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "autorizar",
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
        `/api/admin/documentos/lotes-avancados/${batchId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "concluir",
            nome,
            cpf,
            cargo,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        }
      );
      const fJson = await fRes.json();
      if (!fRes.ok || !fJson.ok) {
        setErro(fJson.error || "Falha ao concluir lote.");
        return;
      }
      setResumo(
        `Concluídos ${fJson.done}/${fJson.total}` +
          (fJson.falhas?.length
            ? ` · falhas: ${fJson.falhas.length}`
            : "")
      );
      setStep("done");
      onCompleted?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro de rede.");
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
        zIndex: 85,
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
          <strong>Lote — Assinatura avançada</strong>
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
            Autorização única + evidência individual por documento. Não é
            ICP-Brasil. Lista imutável após congelamento.
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

          {step === "identity" ? (
            <>
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.45 }}>
                Antes do lote avançado, habilite sua identidade (nível BASIC).
                Isso é exigido pela API e evita falha 403 ao congelar.
              </p>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Nome completo
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  style={field}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                CPF
                <input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  style={field}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Cargo
                <input
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  style={field}
                />
              </label>
              <button
                type="button"
                disabled={busy || nome.trim().length < 3 || cpf.replace(/\D/g, "").length < 11}
                onClick={() => void habilitarIdentidade()}
                style={{
                  marginTop: 12,
                  background: "#1d4ed8",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {busy ? "Salvando…" : "Habilitar identidade e continuar"}
              </button>
            </>
          ) : null}

          {step === "create" ? (
            <>
              {identityOk ? (
                <p style={{ fontSize: 13, color: "#6ee7b7" }}>
                  Identidade habilitada{nome ? `: ${nome}` : ""}.
                </p>
              ) : null}
              <p style={{ fontSize: 14 }}>
                Documentos selecionados: <strong>{documentIds.length}</strong>
              </p>
              <ul style={{ fontSize: 12, color: "#94a3b8" }}>
                {documentIds.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
              <button
                type="button"
                disabled={busy || documentIds.length < 1}
                onClick={() => void criar()}
                style={{
                  marginTop: 12,
                  background: "#1d4ed8",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {busy ? "Congelando…" : "Congelar lote e continuar"}
              </button>
            </>
          ) : null}

          {step === "consent" ? (
            <>
              <p style={{ fontSize: 13 }}>
                Itens: {itemCount} · Hash do lote:{" "}
                <code style={{ fontSize: 11 }}>{batchHash}</code>
              </p>
              <ul style={{ fontSize: 12, color: "#94a3b8" }}>
                {items.map((it) => (
                  <li key={it.documentId}>
                    {it.documentId.slice(0, 8)}… · {it.documentHashSha256.slice(0, 12)}…
                  </li>
                ))}
              </ul>
              <label style={{ display: "flex", gap: 8, fontSize: 14, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={viewed}
                  onChange={(e) => setViewed(e.target.checked)}
                />
                Visualizei cada documento do lote.
              </label>
              <label style={{ display: "flex", gap: 8, fontSize: 14, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={listOk}
                  onChange={(e) => setListOk(e.target.checked)}
                />
                Confirmo a lista e a quantidade ({itemCount}) — sem alterações.
              </label>
              <label style={{ display: "flex", gap: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>{ADV_BATCH_CONSENT_TEXT}</span>
              </label>
              <button
                type="button"
                disabled={busy || !viewed || !listOk || !consent}
                onClick={() => void consentirEMfa()}
                style={{
                  marginTop: 14,
                  background: "#0f766e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {busy ? "Enviando MFA…" : "Aceitar e receber MFA"}
              </button>
            </>
          ) : null}

          {step === "auth" ? (
            <>
              {devCode ? (
                <p style={{ color: "#fbbf24", fontSize: 13 }}>
                  MFA: <strong>{devCode}</strong>
                </p>
              ) : null}
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={field}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Código MFA
                <input value={otp} onChange={(e) => setOtp(e.target.value)} style={field} />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Nome
                <input value={nome} onChange={(e) => setNome(e.target.value)} style={field} />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                CPF
                <input value={cpf} onChange={(e) => setCpf(e.target.value)} style={field} />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Cargo
                <input value={cargo} onChange={(e) => setCargo(e.target.value)} style={field} />
              </label>
              <button
                type="button"
                disabled={busy || !password || !otp || nome.length < 3}
                onClick={() => void autorizarEConcluir()}
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
                {busy ? "Processando…" : "Autorizar e assinar lote"}
              </button>
            </>
          ) : null}

          {step === "done" ? (
            <p style={{ color: "#6ee7b7", fontWeight: 600 }}>{resumo}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
