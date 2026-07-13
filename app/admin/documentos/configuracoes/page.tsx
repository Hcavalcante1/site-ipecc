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
  const [govbrOk, setGovbrOk] = useState(false);
  const [documensoOk, setDocumensoOk] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [provedorPadrao, setProvedorPadrao] = useState<string | null>(null);
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
    setGovbrOk(Boolean(json.govbrConfigurado));
    setDocumensoOk(Boolean(json.documenso?.configurado));
    setWebhookUrl(json.documenso?.webhookUrl || "");
    setApiUrl(json.documenso?.apiUrl || "");
    setProvedorPadrao(json.provedorPadrao || null);
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
          Documento — assinatura digital (ente privado)
        </h2>
        <p style={{ marginTop: 0 }}>
          Status:{" "}
          <strong>
            {documensoOk ? "API token presente" : "não configurado"}
          </strong>
          {" · "}
          Padrão atual: <strong>{provedorPadrao || "nenhum"}</strong>
          {" · "}
          Algum provedor pronto:{" "}
          <strong>{configurado ? "sim" : "não"}</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          <li>
            API URL:{" "}
            <code>{apiUrl || "(defina DOCUMENSO_API_URL da sua instância)"}</code>
          </li>
          <li>
            Webhook (configure no motor de assinatura):{" "}
            <code>{webhookUrl}</code>
          </li>
          <li>DOCUMENSO_API_URL (obrigatório)</li>
          <li>DOCUMENSO_API_TOKEN (obrigatório)</li>
          <li>DOCUMENSO_WEBHOOK_SECRET (opcional)</li>
        </ul>
        <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 0 }}>
          Suba o motor self-host: <code>services/documenso/</code> (veja o
          README da pasta).
        </p>
      </div>

      <div style={gdCardStyle}>
        <h2 className="admin-h2" style={{ marginTop: 0 }}>
          gov.br (somente órgãos públicos)
        </h2>
        <p style={{ marginTop: 0 }}>
          Status servidor:{" "}
          <strong>{govbrOk ? "credenciais presentes" : "ausentes"}</strong>
        </p>
        <p style={{ fontSize: 13, opacity: 0.9 }}>
          A API de Assinatura Avançada gov.br{" "}
          <strong>não libera credenciais para entes privados</strong>. Use
          o provedor Documento no IPECC.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          <li>
            Ambiente: <code>{env}</code> (GOVBR_SIGNATURE_ENV)
          </li>
          <li>
            Redirect URI: <code>{redirectUri}</code>
          </li>
          <li>GOVBR_SIGNATURE_CLIENT_ID / SECRET</li>
        </ul>
        <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 0 }}>
          Manual ITI:{" "}
          <a
            href="https://manual-integracao-assinatura-eletronica.servicos.gov.br/pt-br/7.4/iniciarintegracao.html"
            target="_blank"
            rel="noreferrer"
          >
            roteiro v7.4
          </a>
          .
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
          Ativos no código: documento, govbr. Futuros: icp_brasil, clicksign,
          autentique, docusign, zapsign, adobe_sign.
        </p>
      </div>
    </GestaoDocumentalShell>
  );
}
