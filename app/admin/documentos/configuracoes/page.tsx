"use client";

import { useCallback, useEffect, useState } from "react";
import GestaoDocumentalShell, {
  gdBtnStyle,
  gdCardStyle,
} from "../components/GestaoDocumentalShell";

type Provider = {
  id: string;
  code: string;
  name: string;
  ativo: boolean;
  servidor_pronto?: boolean;
};

export default function ConfiguracoesPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [configurado, setConfigurado] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [env, setEnv] = useState("staging");
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const res = await fetch("/api/admin/documentos/configuracoes", {
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao carregar configurações.");
      return;
    }
    setProviders(json.providers || []);
    setConfigurado(Boolean(json.configurado));
    setRedirectUri(json.redirectUri || "");
    setEnv(json.env || "staging");
    setAviso("");
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function toggleAtivo(code: string, ativo: boolean) {
    const res = await fetch("/api/admin/documentos/configuracoes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ativo }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAviso(json.error || "Erro ao atualizar provedor.");
      return;
    }
    carregar();
  }

  return (
    <GestaoDocumentalShell
      title="Configurações"
      description="Provedores de assinatura e parâmetros do módulo (somente servidor)."
    >
      {aviso ? (
        <div style={{ ...gdCardStyle, borderColor: "#f59e0b" }}>{aviso}</div>
      ) : null}

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          gov.br (Fase 4)
        </h2>
        <p style={{ marginTop: 0 }}>
          Status servidor:{" "}
          <strong>{configurado ? "credenciais presentes" : "ausentes"}</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          <li>
            Ambiente: <code>{env}</code> (GOVBR_SIGNATURE_ENV)
          </li>
          <li>
            Redirect URI: <code>{redirectUri}</code>
          </li>
          <li>GOVBR_SIGNATURE_CLIENT_ID</li>
          <li>GOVBR_SIGNATURE_CLIENT_SECRET</li>
          <li>GOVBR_SIGNATURE_REDIRECT_URI (opcional)</li>
        </ul>
        <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 0 }}>
          O client_secret nunca deve existir no frontend. Cadastre o redirect no
          portal de integração gov.br/ITI.
        </p>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          Provedores
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {providers.map((p) => (
            <li
              key={p.code}
              style={{
                borderTop: "1px solid #334155",
                padding: "10px 0",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div>
                <strong>{p.name}</strong> ({p.code})
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Ativo: {p.ativo ? "sim" : "não"} · Servidor:{" "}
                  {p.servidor_pronto ? "pronto" : "pendente"}
                </div>
              </div>
              <button
                type="button"
                style={gdBtnStyle}
                onClick={() => toggleAtivo(p.code, !p.ativo)}
              >
                {p.ativo ? "Desativar" : "Ativar"}
              </button>
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
          Futuros: icp_brasil, clicksign, autentique, docusign, zapsign,
          adobe_sign.
        </p>
      </div>
    </GestaoDocumentalShell>
  );
}
