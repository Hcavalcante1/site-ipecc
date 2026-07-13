"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
  gdInputStyle,
} from "../components/GestaoDocumentalShell";

type SignatureRow = {
  id: string;
  document_id: string;
  status: string;
  provider_code: string;
  signed_storage_path: string | null;
  error_message: string | null;
  created_at: string;
};

export default function AssinaturasClient() {
  const search = useSearchParams();
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState("");
  const [configurado, setConfigurado] = useState(false);

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
    if (cfgRes.ok) setConfigurado(Boolean(cfg.configurado));
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

  async function criarPedido() {
    if (!documentId.trim()) {
      setAviso("Informe o ID do documento.");
      return;
    }
    const res = await fetch("/api/admin/documentos/assinaturas", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao criar pedido.");
      return;
    }
    setDocumentId("");
    setAviso("Pedido de assinatura criado.");
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
      description="Assinatura digital via Assinatura Avançada gov.br (OAuth2 + PKCS#7)."
    >
      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b" }}>{aviso}</div>
      ) : null}

      <div style={gdCardStyle}>
        <p style={{ marginTop: 0 }}>
          Provedor gov.br:{" "}
          <strong>
            {configurado ? "credenciais no servidor" : "não configurado"}
          </strong>
          {!configurado
            ? " — defina GOVBR_SIGNATURE_CLIENT_ID / SECRET / REDIRECT_URI / ENV na Vercel."
            : null}
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            style={gdInputStyle}
            placeholder="ID do documento pronto para assinar"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
          />
          <button type="button" style={gdBtnStyle} onClick={criarPedido}>
            Criar pedido
          </button>
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
                  <strong>{row.status}</strong> · {row.provider_code}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Doc:{" "}
                  <Link href={`/admin/documentos/documentos/${row.document_id}`}>
                    {row.document_id.slice(0, 8)}…
                  </Link>
                  {" · "}
                  {new Date(row.created_at).toLocaleString("pt-BR")}
                </div>
                {row.error_message ? (
                  <div style={{ color: "#fca5a5", fontSize: 13 }}>
                    {row.error_message}
                  </div>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {row.status !== "signed" ? (
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
                ) : (
                  <span style={{ fontSize: 13, color: "#86efac" }}>
                    Assinado
                    {row.signed_storage_path
                      ? ` · ${row.signed_storage_path}`
                      : ""}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </GestaoDocumentalShell>
  );
}
